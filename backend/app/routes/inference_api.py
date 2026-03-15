from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import pandas as pd
import numpy as np
import joblib
import os
import json
import logging

from app.services.chatbot_service import chatbot_service
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/inference", tags=["Prediction Engine"])
logger = logging.getLogger(__name__)

# Fix unpickling for custom class
import sys
try:
    import train_model
    sys.modules['__main__'].OOFWeightedStacker = train_model.OOFWeightedStacker
except ImportError:
    pass

# Load models globally
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml_models")

try:
    pipeline_data = joblib.load(os.path.join(MODELS_DIR, "preprocessing_pipeline.pkl"))
    preprocessor = pipeline_data['preprocessor']
    selected_features = pipeline_data.get('selected_features', [])
    good_feat_idx = pipeline_data.get('good_feat_idx', [])
    
    calibrated_model = joblib.load(os.path.join(MODELS_DIR, "calibrated_model.pkl"))
    
    with open(os.path.join(MODELS_DIR, "threshold.txt"), "r") as f:
        threshold = float(f.read().strip())
        
except Exception as e:
    logger.warning(f"Warning: Could not load ML models. Ensure train_model.py has been run. {e}")
    preprocessor = None
    calibrated_model = None
    threshold = 0.5
    selected_features = []
    good_feat_idx = []

class EnvironmentalData(BaseModel):
    AQI: float
    PM10: float
    PM2_5: float
    NO2: float
    SO2: float
    O3: float
    Temperature: float
    Humidity: float
    WindSpeed: float
    RespiratoryCases: float
    CardiovascularCases: float
    HospitalAdmissions: float
    HealthImpactScore: float
    
class PredictionRequest(BaseModel):
    environmental_data: EnvironmentalData
    optional_patient_data: Optional[dict] = {}

def apply_feature_engineering(df):
    df['PollutionIndex'] = (df['PM2_5'] + df['PM10'] + df['NO2'] + df['SO2'] + df['O3']) / 5.0
    df['WeatherStress'] = df['Temperature'] * df['Humidity']
    df['PollutionHumidityInteraction'] = df['PM2_5'] * df['Humidity']
    return df

@router.post("/predict")
async def get_risk_prediction(request: PredictionRequest, user = Depends(get_current_user)):
    if calibrated_model is None or preprocessor is None:
        raise HTTPException(status_code=500, detail="ML Models not loaded setup failed.")
        
    try:
        # Convert input to dataframe
        input_dict = request.environmental_data.dict()
        
        # Out-of-Distribution (OOD) Detection
        ood_flags = []
        if not (0 <= input_dict.get('AQI', 0) <= 500): ood_flags.append("AQI")
        if not (0 <= input_dict.get('PM2_5', 0) <= 500): ood_flags.append("PM2.5")
        if not (-30 <= input_dict.get('Temperature', 20) <= 55): ood_flags.append("Temperature")
        if not (0 <= input_dict.get('Humidity', 50) <= 100): ood_flags.append("Humidity")
        
        df = pd.DataFrame([input_dict])
        
        # Feature Engineering
        df = apply_feature_engineering(df)
        
        expected_cols = ['AQI', 'PM10', 'PM2_5', 'NO2', 'SO2', 'O3', 'Temperature', 'Humidity', 
                         'WindSpeed', 'RespiratoryCases', 'CardiovascularCases', 'HospitalAdmissions', 
                         'HealthImpactScore', 'PollutionIndex', 'WeatherStress', 'PollutionHumidityInteraction']
        
        # Ensure correct column order
        df = df[expected_cols]
        
        # Preprocess
        X_p = preprocessor.transform(df)
        if len(good_feat_idx) > 0:
            X_p = X_p[:, good_feat_idx]
        
        # Predict
        ml_score = float(calibrated_model.predict_proba(X_p)[0, 1])
    except Exception as e:
        logger.error(f"ML Prediction failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to run ML prediction")

    # Call AI reasoning service
    ai_prompt = f"""
You are an AI Clinical Assistant. The ML model has predicted an overall disease risk probability of {ml_score:.2f} based on the following environmental data:
{json.dumps(input_dict, indent=2)}.
Optional patient data contextual factors: {json.dumps(request.optional_patient_data)}.

Please provide:
1. An AI risk score between 0.0 and 1.0 evaluating the overall clinical respiratory risk based on these parameters.
2. A short explanation for this score (1-2 sentences).
3. A list of specific respiratory diseases (e.g., Asthma, COPD, Pneumonia, Bronchitis) and their estimated risk percentages based on the inputs.

Return EXACTLY in this JSON format, do not include markdown blocks or any other text:
{{"ai_score": 0.65, "explanation": "High PM2.5 and humidity increase respiratory risk.", "disease_risks": [{{"disease": "Asthma", "risk_percentage": 75}}, {{"disease": "COPD", "risk_percentage": 20}}]}}
"""
    
    try:
        ai_response_text = await chatbot_service.get_response(ai_prompt, request.optional_patient_data)
        # Clean response
        cleaned_response = ai_response_text.strip()
        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:]
        if cleaned_response.startswith("```"):
            cleaned_response = cleaned_response[3:]
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]
            
        ai_data = json.loads(cleaned_response.strip())
        ai_score = float(ai_data.get("ai_score", ml_score))
        ai_explanation = ai_data.get("explanation", "AI reasoning unavailable.")
        disease_risks = ai_data.get("disease_risks", [])
    except Exception as e:
        logger.error(f"AI Service Call failed: {e}")
        ai_score = ml_score # fallback
        ai_explanation = "Failed to parse AI response or AI service unavailable."
        disease_risks = []
        
    # Fusion Logic
    final_risk_score = 0.8 * ml_score + 0.2 * ai_score
    confidence_score = 1.0 - abs(ml_score - ai_score)
    agreement_score = confidence_score # redundant but requested
    
    safety_flags_list = []
    
    # OOD penalty
    if ood_flags:
        safety_flags_list.append(f"Input data outside model training distribution: {', '.join(ood_flags)}")
        confidence_score -= 0.30 # Arbitrary penalty for out of distribution

    # Model Agreement Validation
    disagreement = abs(ml_score - ai_score)
    if disagreement > 0.40:
        safety_flags_list.append("Low reliability: High disagreement between ML model and AI reasoning. Manual review recommended.")
    elif disagreement > 0.30:
        safety_flags_list.append("Low agreement between ML model and AI reasoning.")
    # Minimum Confidence Threshold
    if confidence_score < 0.50:
        safety_flags_list.append("Low confidence prediction.")

    # Uncertainty & Risk Category Classification
    if 0.40 < final_risk_score < 0.60:
        risk_category = "Uncertain"
        safety_flags_list.append("Prediction uncertain. Additional clinical data recommended.")
    elif final_risk_score >= 0.60:
        risk_category = "High Risk"
    elif final_risk_score <= 0.30:
        risk_category = "Low Risk"
    else:
        risk_category = "Moderate Risk"
        
    final_safety_flag = " | ".join(safety_flags_list)
    medical_disclaimer = "This prediction is an AI-generated risk estimate and should not be used as a medical diagnosis. Consult a qualified healthcare professional for medical advice."
    
    # Logging for Safety Monitoring
    log_data = {
        "input_data": input_dict,
        "ml_score": ml_score,
        "ai_score": ai_score,
        "disagreement_level": disagreement,
        "final_risk_score": final_risk_score,
        "confidence_score": confidence_score,
        "safety_flags": final_safety_flag
    }
    logger.info(f"Prediction Safety Log: {json.dumps(log_data)}")
        
    return {
        "ml_score": round(ml_score, 4),
        "ai_score": round(ai_score, 4),
        "final_risk_score": round(final_risk_score, 4),
        "risk_category": risk_category,
        "confidence_score": round(confidence_score, 4),
        "agreement_score": round(agreement_score, 4),
        "top_risk_factors": list(selected_features)[:5],
        "ai_explanation": ai_explanation,
        "disease_risks": disease_risks,
        "safety_flag": final_safety_flag,
        "medical_disclaimer": medical_disclaimer
    }

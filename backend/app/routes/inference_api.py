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
async def get_risk_prediction(environmental_data: EnvironmentalData, optional_patient_data: Optional[dict] = None, user = Depends(get_current_user)):
    """
    ML + AI Reasoning Prediction Endpoint.
    Fused inference from XGBoost/Stacking ensemble and LangChain-based AI.
    """
    if calibrated_model is None or preprocessor is None:
        raise HTTPException(status_code=500, detail="ML Models not loaded setup failed.")
        
    try:
        # Convert input to dataframe
        input_dict = environmental_data.dict()
        
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

    # --- AI Ensembling Integration ---
    patient_data = optional_patient_data or {}
    
    ai_prompt = f"""
You are an advanced clinical AI specializing in environmental health, air pollution exposure, and related respiratory and cardiovascular diseases.

Your goal is to generate a HIGH-CONFIDENCE, medically logical risk assessment based strictly on the given data.

-------------------------------------
INPUT DATA
-------------------------------------
Environmental Data:
- AQI: {input_dict.get('AQI', 'N/A')}
- PM2.5: {input_dict.get('PM2_5', 'N/A')}
- PM10: {input_dict.get('PM10', 'N/A')}
- NO2: {input_dict.get('NO2', 'N/A')}
- SO2: {input_dict.get('SO2', 'N/A')}
- CO: {input_dict.get('CO', 'N/A')}
- O3: {input_dict.get('O3', 'N/A')}

Patient Data:
- Age: {patient_data.get('age', 'N/A')}
- Gender: {patient_data.get('gender', 'N/A')}
- Symptoms: {patient_data.get('symptoms', 'None reported')}
- Smoking Status: {patient_data.get('lifestyle', {}).get('smoking_habits', 'Unknown')}
- Medical History: {patient_data.get('medical_history', 'Unknown')}
- Exposure Duration: {patient_data.get('lifestyle', {}).get('outdoor_time_hours', 'Unknown')} hours/day

-------------------------------------
TASK
-------------------------------------
1. Identify the MOST LIKELY pollution-related diseases affecting this individual.
   - Focus ONLY on respiratory and cardiovascular conditions
   - DO NOT use any predefined or fixed disease list
   - Only include conditions that are strongly supported by the data

2. Assign a realistic risk percentage (0-100) for each condition based on:
   - Pollution severity (AQI and pollutants)
   - Pollutant-specific effects (e.g., PM2.5 -> lung inflammation, NO2 -> cardiovascular stress)
   - Patient vulnerability (age, smoking, medical history)
   - Symptom correlation

3. For EACH condition provide clear clinical reasoning:
   - Explicitly explain: pollutant -> biological effect -> disease
   - Connect symptoms (if present)
   - Avoid repetition across conditions

4. Provide a detailed overall explanation:
   - Identify the most harmful pollutants in this case
   - Explain short-term vs long-term health impact
   - Highlight the strongest risk drivers

-------------------------------------
STRICT RULES (ANTI-HALLUCINATION)
-------------------------------------
- DO NOT generate rare, unrelated, or unsupported diseases
- DO NOT guess if data is insufficient
- If uncertain, LOWER the risk score instead of inventing conditions
- DO NOT use generic statements like "air pollution is harmful"
- Each condition MUST have unique reasoning
- Be conservative and clinically realistic

-------------------------------------
CONSISTENCY & CONFIDENCE GUIDELINES
-------------------------------------
- Only include conditions that you are reasonably confident about
- Exclude conditions with weak or no evidence from the data
- Prefer common pollution-related diseases over rare ones
- Ensure the output is stable and not overly sensitive to minor data variations

-------------------------------------
OUTPUT CONSTRAINTS
-------------------------------------
- Include ONLY top 4-6 conditions
- Exclude any condition with risk < 20%
- Keep reasoning concise but meaningful (2-3 lines per condition)
- Overall explanation should be 5-8 lines

-------------------------------------
OUTPUT FORMAT (STRICT JSON ONLY)
-------------------------------------
{{
  "conditions": [
    {{
      "name": "Condition name",
      "risk": 0,
      "reason": "Specific clinical reasoning (pollutant -> effect -> disease)"
    }}
  ],
  "explanation": "Detailed clinical explanation covering pollutants, risks, and impact"
}}
"""
    
    try:
        # Fetch fused ensemble response from Groq + Gemini
        ai_data = await chatbot_service.get_ensemble_response(ai_prompt)
        
        if not ai_data or len(ai_data.get("conditions", [])) == 0:
            raise Exception("AI reasoning returned bad schema or empty conditions.")
            
        # Optional AI Score fallback since prompt no longer asks for it
        # Assume an AI risk score based on the highest condition probability
        highest_risk = 0.0
        disease_risks = []
        
        for c in ai_data.get("conditions", []):
            risk_val = float(c.get("risk", 0)) / 100.0
            if risk_val > highest_risk:
                highest_risk = risk_val
                
            # Map backend model output to legacy frontend schema
            disease_risks.append({
                "disease": c.get("name", "Unknown Risk"),
                "risk_percentage": round(c.get("risk", 0)),
                "reason": c.get("reason", "")
            })
            
        ai_score = highest_risk if highest_risk > 0 else ml_score
        ai_explanation = ai_data.get("explanation", "AI reasoning unavailable.")
        
    except Exception as e:
        logger.error(f"Ensemble AI Service Call failed: {e}")
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

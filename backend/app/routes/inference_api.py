from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
import pandas as pd
import numpy as np
import joblib
import os
import json
import logging
from datetime import datetime, timezone
import sentry_sdk

from app.services.chatbot_service import chatbot_service
from app.services.ml_service import ml_service
from app.services.doctor_dataset import get_doctors
from app.core.dependencies import get_current_user
from app.core.rate_limit import limiter

router = APIRouter(prefix="/inference", tags=["Prediction Engine"])
logger = logging.getLogger(__name__)

# Fix unpickling for custom ensemble classes
import sys
try:
    import train_model
    from app.ml_ensemble import CustomEnsemble
    
    # Map both names to the CustomEnsemble class in the __main__ module
    sys.modules['__main__'].OOFWeightedStacker = CustomEnsemble
    sys.modules['__main__'].CustomEnsemble = CustomEnsemble
    
    # Also ensure they are available in the train_model module if referenced there
    train_model.OOFWeightedStacker = CustomEnsemble
    train_model.CustomEnsemble = CustomEnsemble
except Exception as e:
    logging.warning(f"Could not setup unpickling aliases: {e}")

# Define MODELS_DIR
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "ml_models")

# Environmental model assets
calibrated_model = None
preprocessor = None
good_feat_idx = list(range(13)) 

# Load clinical model
try:
    clinical_model_path = os.path.join(MODELS_DIR, "clinical_diagnostic_model.pkl")
    if os.path.exists(clinical_model_path):
        clinical_data = joblib.load(clinical_model_path)
        clinical_pipeline = clinical_data.get('pipeline')
        clinical_symptoms = clinical_data.get('symptom_list', [])
        clinical_feature_names = clinical_data.get('feature_names', [])
        clinical_classes = clinical_data.get('class_mapping', {})
    else:
        logger.warning(f"Clinical diagnostic model not found at {clinical_model_path}")
        clinical_pipeline = None
        clinical_feature_names = ["Age", "Smoking", "Vitals"]
except Exception as e:
    logger.warning(f"Could not load clinical diagnostic model: {e}")
    clinical_pipeline = None
    clinical_feature_names = ["Age", "Smoking", "Vitals"]

# Load Environmental ML models
try:
    env_model_path = os.path.join(MODELS_DIR, "calibrated_model.pkl")
    env_preprocessor_path = os.path.join(MODELS_DIR, "preprocessing_pipeline.pkl")
    if os.path.exists(env_model_path) and os.path.exists(env_preprocessor_path):
        calibrated_model = joblib.load(env_model_path)
        preprocessor = joblib.load(env_preprocessor_path)
    else:
        logger.warning("Environmental model assets missing - using fallback.")
except Exception as e:
    logger.warning(f"Environmental models could not be loaded: {e}")

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
    model_config = ConfigDict(extra="forbid")
    
class PredictionRequest(BaseModel):
    environmental_data: EnvironmentalData
    optional_patient_data: Optional[dict] = {}
    model_config = ConfigDict(extra="forbid")

def apply_feature_engineering(df):
    df['PollutionIndex'] = (df['PM2_5'] + df['PM10'] + df['NO2'] + df['SO2'] + df['O3']) / 5.0
    df['WeatherStress'] = df['Temperature'] * df['Humidity']
    df['PollutionHumidityInteraction'] = df['PM2_5'] * df['Humidity']
    return df

def _to_float(value, default=0.0):
    try:
        if value in (None, ""):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default

@router.post("/predict")
@limiter.limit("12/minute")
async def get_risk_prediction(request: Request, environmental_data: EnvironmentalData, optional_patient_data: Optional[dict] = None, user = Depends(get_current_user), expand: bool = False):
    """
    Enhanced Hybrid Inference: Environmental + Clinical ML + AI Reasoning.
    Includes input quality scoring, insufficient-data detection, validity scoring, and confidence banding.
    """
    patient_data = optional_patient_data or {}
    env_dict = environmental_data.dict()
    vitals = patient_data.get('vitals', {})
    inhale_capacity = _to_float(vitals.get('inhale_capacity'))
    exhale_capacity = _to_float(vitals.get('exhale_capacity'))
    breath_hold_time = _to_float(vitals.get('breath_hold_time'))

    # ─── Input Quality & Insufficient Data Detection ─────────────────────────
    def _compute_input_quality(pd_data, ed_data):
        score = 0.0
        missing = []

        vitals = pd_data.get('vitals', {})
        vital_checks = [
            ('spo2', vitals.get('spo2') not in (None, 0)),
            ('breath_hold_time', vitals.get('breath_hold_time') not in (None, 0)),
            ('inhale_capacity', vitals.get('inhale_capacity') not in (None, 0)),
            ('exhale_capacity', vitals.get('exhale_capacity') not in (None, 0)),
            ('cough_severity', vitals.get('cough_severity') is not None),
        ]
        v_score = sum(1 for _, ok in vital_checks if ok) / len(vital_checks)
        for label, ok in vital_checks:
            if not ok: missing.append(f'vitals.{label}')
        score += v_score * 0.35

        symptoms = pd_data.get('symptoms', [])
        if symptoms and len(symptoms) > 0:
            score += 0.25
        else:
            missing.append('symptoms')

        demo_checks = [
            ('age', pd_data.get('age') not in (None, 0, 30)),
            ('gender', pd_data.get('gender') not in (None, 'Unknown', '')),
        ]
        d_score = sum(1 for _, ok in demo_checks if ok) / len(demo_checks)
        for label, ok in demo_checks:
            if not ok: missing.append(f'demographics.{label}')
        score += d_score * 0.20

        lifestyle = pd_data.get('lifestyle', {})
        if lifestyle.get('smoking_habits') not in (None, 'Unknown', ''):
            score += 0.10
        else:
            missing.append('lifestyle.smoking_habits')

        env_ok = ed_data.get('AQI', 0) > 0 and ed_data.get('PM2_5', 0) >= 0
        if env_ok:
            score += 0.10
        else:
            missing.append('environment.AQI')

        return round(score, 3), missing

    input_quality_score, missing_inputs = _compute_input_quality(patient_data, env_dict)
    respiratory_quality_bonus = 0.0
    if inhale_capacity >= 4:
        respiratory_quality_bonus += 0.02
    if exhale_capacity >= 3:
        respiratory_quality_bonus += 0.02
    if breath_hold_time >= 20:
        respiratory_quality_bonus += 0.03
    input_quality_score = min(1.0, input_quality_score + respiratory_quality_bonus)

    critical_missing = [m for m in missing_inputs if m in ('vitals.spo2', 'vitals.inhale_capacity', 'vitals.exhale_capacity', 'symptoms', 'environment.AQI')]
    if input_quality_score < 0.20 and len(critical_missing) >= 3:
        sentry_sdk.capture_message(
            "ML_INVALID_INPUT",
            level="warning",
            contexts={"ml_input": {"missing_inputs": critical_missing, "quality_score": input_quality_score}}
        )
        return {
            "insufficient_data": True,
            "input_quality_score": input_quality_score,
            "missing_inputs": critical_missing,
            "message": "Not enough data to generate a reliable prediction. Please complete your vitals and symptom information.",
            "medical_disclaimer": "This system provides AI-assisted risk insights and is not a medical diagnosis."
        }
    
    # --- 1. Environmental ML Prediction ---
    try:
        if calibrated_model and preprocessor:
            df_env = pd.DataFrame([env_dict])
            df_env = apply_feature_engineering(df_env)
            expected_cols = ['AQI', 'PM10', 'PM2_5', 'NO2', 'SO2', 'O3', 'Temperature', 'Humidity', 
                             'WindSpeed', 'RespiratoryCases', 'CardiovascularCases', 'HospitalAdmissions', 
                             'HealthImpactScore', 'PollutionIndex', 'WeatherStress', 'PollutionHumidityInteraction']
            df_env = df_env[expected_cols]
            X_env = preprocessor.transform(df_env)
            if len(good_feat_idx) > 0:
                X_env = X_env[:, good_feat_idx]
            env_ml_score = float(calibrated_model.predict_proba(X_env)[0, 1])
        else:
            env_ml_score = 0.5
    except Exception as e:
        logger.error(f"Env ML Prediction failed: {e}")
        env_ml_score = 0.5

    # --- 2. Clinical ML Prediction ---
    clinical_probs = {}
    clin_ml_score = 0.0
    primary_clin_disease = None
    
    # 2a. Large Ensemble
    try:
        breath_data = patient_data.get('vitals', {})
        token = getattr(user, 'token', None) if user else None
        ml_result = await ml_service.predict_risk(patient_data, breath_data, env_dict.get('AQI', 50), token=token)
        
        if ml_result.get("status") == "success":
            for pred in ml_result.get("top_predictions", []):
                clinical_probs[pred["disease"]] = float(pred["confidence"])
            primary_clin_disease = ml_result.get("prediction")
            clin_ml_score = ml_result["top_predictions"][0]["confidence"] if ml_result.get("top_predictions") else ml_result.get("confidence", 0.0)
    except Exception as e:
        logger.error(f"Large Ensemble ML Prediction failed: {e}")

    # 2b. Clinical Baseline
    if clinical_pipeline:
        try:
            raw_symptoms_val = patient_data.get('symptoms', [])
            raw_symptoms = " ".join([str(s).lower() for s in raw_symptoms_val]) if isinstance(raw_symptoms_val, list) else str(raw_symptoms_val).lower()
            
            input_dict = {
                'Age': float(patient_data.get('age', 30)),
                'Gender': patient_data.get('gender', 'Other'),
                'Smoking': patient_data.get('lifestyle', {}).get('smoking_habits', 'Never'),
                'AQI': float(env_dict.get('AQI', 50)),
                'BMI': float(patient_data.get('bmi', 24.5)),
                'SpO2': float(patient_data.get('vitals', {}).get('spo2', 98)),
                'BreathHold': float(patient_data.get('vitals', {}).get('breath_hold_time', 45)),
                'InhaleCapacity': float(patient_data.get('vitals', {}).get('inhale_capacity', 5)),
                'ExhaleCapacity': float(patient_data.get('vitals', {}).get('exhale_capacity', 4))
            }
            for sym in clinical_symptoms:
                input_dict[f'sym_{sym}'] = 1 if sym in raw_symptoms else 0
            
            X_clin = pd.DataFrame([input_dict])
            for col in clinical_feature_names:
                if col not in X_clin.columns: X_clin[col] = 0
            X_clin = X_clin[clinical_feature_names]
            
            clin_probas = clinical_pipeline.predict_proba(X_clin)[0]
            for idx, prob in enumerate(clin_probas):
                disease_name = clinical_classes.get(str(idx), "Unknown")
                if disease_name not in clinical_probs:
                    clinical_probs[disease_name] = float(prob)
                else:
                    clinical_probs[disease_name] = (clinical_probs[disease_name] * 0.7) + (float(prob) * 0.3)
            
            if not primary_clin_disease:
                top_idx = np.argmax(clin_probas)
                primary_clin_disease = clinical_classes.get(str(top_idx), "Unknown")
                clin_ml_score = float(clin_probas[top_idx])
        except Exception as e:
            logger.error(f"Clinical Baseline Prediction failed: {e}")

    # --- 3. AI Reasoning ---
    ai_prompt = f"""
    You are an advanced clinical diagnostic AI specializing in respiratory health for Breathometer 5.0.
    -------------------------------------
    PATIENT PROFILE
    -------------------------------------
    Age: {patient_data.get('age')}
    Symptoms: {patient_data.get('symptoms')}
    Smoking History: {patient_data.get('lifestyle', {}).get('smoking_habits')}
    Vitals: SpO2 {patient_data.get('vitals', {}).get('spo2')}%, Inhale Capacity {patient_data.get('vitals', {}).get('inhale_capacity')}s, Exhale Capacity {patient_data.get('vitals', {}).get('exhale_capacity')}s, Breath Hold {patient_data.get('vitals', {}).get('breath_hold_time')}s
    Functional Breathlessness: {patient_data.get('vitals', {}).get('stairs_difficulty')}
    Local AQI: {env_dict.get('AQI')}
    
    -------------------------------------
    YOUR TASK (STRICT)
    -------------------------------------
    1. Identify up to 8 of the most likely respiratory or cardiovascular conditions.
    2. YOU MUST provide at least 3 distinct possibilities. If the symptoms are vague or confidence is low, provide up to 8.
    3. Provide a specific risk percentage (0-100) for EACH. ensure they are realistic.
    4. Provide reasoning for each, especially how the environmental data (AQI) plus inhale, exhale, breath-hold, and SpO2 influenced the outcome.
    5. Output MUST be a valid JSON object.
    
    -------------------------------------
    RESPONSE FORMAT (STRICT JSON)
    -------------------------------------
    {{ 
      "conditions": [ 
        {{ "name": "Exact Disease Name", "risk": 85, "reason": "Specific clinical reason..." }},
        {{ "name": "Alternative Condition 1", "risk": 45, "reason": "Reasoning..." }},
        {{ "name": "Alternative Condition 2", "risk": 20, "reason": "Reasoning..." }},
        {{ "name": "...", "risk": 10, "reason": "..." }}
      ], 
      "explanation": "Brief overview of the patient status." 
    }}
    """
    
    ai_conditions = []
    ai_explanation = ""
    ai_primary_risk = 0.0
    
    try:
        ai_data = await chatbot_service.get_ensemble_response(ai_prompt)
        ai_conditions = ai_data.get("conditions", [])
        ai_explanation = ai_data.get("explanation", "Reasoning analysis complete.")
        if ai_conditions:
            ai_primary_risk = float(ai_conditions[0].get("risk", 0)) / 100.0
    except Exception as e:
        logger.error(f"AI Reasoning logic failed: {e}")
        ai_explanation = "AI reasoning service temporarily unavailable. Results based on clinical ML patterns."

    # --- 4. Hybrid Integration Layer ---
    integrated_map = {}
    for ac in ai_conditions:
        name = ac.get("name", "Unknown Condition").title()
        key = name.lower().strip()
        integrated_map[key] = {
            "disease": name,
            "ai_risk": float(ac.get("risk", 0)) / 100.0,
            "ml_risk": 0.0,
            "reason": ac.get("reason", "Identified via symptom-vitals reasoning.")
        }
        
    for m_name, m_prob in clinical_probs.items():
        m_key = m_name.lower().strip()
        # Find partial matches or create new entry
        found = False
        for key in list(integrated_map.keys()):
            if m_key in key or key in m_key:
                integrated_map[key]["ml_risk"] = float(m_prob)
                integrated_map[key]["reason"] += f" [Corroborated by ML: {round(m_prob*100)}%]"
                found = True
                break
        
        if not found:
            integrated_map[m_key] = {
                "disease": m_name.title(),
                "ai_risk": 0.0,
                "ml_risk": float(m_prob),
                "reason": "Identified by statistical clinical pattern analysis."
            }

    final_disease_risks = []
    for _, item in integrated_map.items():
        ai_r, ml_r = item["ai_risk"], item["ml_risk"]
        # WEIGHTED BLEND: 80% AI Priority (User requested higher reliance on AI)
        blended = (0.80 * ai_r) + (0.20 * ml_r) if ai_r > 0 and ml_r > 0 else (ai_r * 0.95 if ai_r > 0 else ml_r * 0.70)
        
        if blended > 0.01 or len(final_disease_risks) < 3:
            final_disease_risks.append({
                "disease": item["disease"],
                "risk_percentage": round(blended * 100),
                "reason": item["reason"],
                "severity": "high" if any(x in item["disease"].lower() for x in ["copd", "pneumonia", "cancer", "heart", "tuberculosis"]) else "moderate",
                "specialty": next((v for k, v in {
                    "asthma": "Pulmonologist", 
                    "copd": "Pulmonologist", 
                    "pneumonia": "Pulmonologist", 
                    "bronchitis": "Pulmonologist", 
                    "cancer": "Oncologist", 
                    "heart": "Cardiologist",
                    "tuberculosis": "Infectious Disease Specialist"
                }.items() if k in item["disease"].lower()), "General Physician")
            })

    # ENFORCED ML-ONLY FALLBACK (Absolute Guarentee)
    if not final_disease_risks and clinical_probs:
        for m_name, m_prob in sorted(clinical_probs.items(), key=lambda x: x[1], reverse=True)[:3]:
            final_disease_risks.append({
                "disease": m_name,
                "risk_percentage": round(m_prob * 100),
                "reason": "Identified purely by statistical clinical models.",
                "severity": "high" if any(x in m_name.lower() for x in ["copd", "pneumonia", "cancer", "heart", "tuberculosis"]) else "moderate",
                "specialty": "General Physician"
            })

    respiratory_strain = 0.0
    if inhale_capacity and inhale_capacity < 4:
        respiratory_strain += 0.08
    elif inhale_capacity and inhale_capacity < 5:
        respiratory_strain += 0.04

    if exhale_capacity and exhale_capacity < 3:
        respiratory_strain += 0.08
    elif exhale_capacity and exhale_capacity < 4:
        respiratory_strain += 0.04

    if breath_hold_time and breath_hold_time < 15:
        respiratory_strain += 0.10
    elif breath_hold_time and breath_hold_time < 25:
        respiratory_strain += 0.05

    stairs_difficulty = str(vitals.get('stairs_difficulty', '') or '')
    if stairs_difficulty == 'Severe breathlessness':
        respiratory_strain += 0.10
    elif stairs_difficulty == 'Moderate breathlessness':
        respiratory_strain += 0.05

    # Metrics & Trust
    # FINAL RISK SCORE: Scaled between 0-1
    final_risk_score = min(1.0, (ai_primary_risk * 0.70) + (clin_ml_score * 0.15) + (env_ml_score * 0.15) + respiratory_strain)
    
    agreement = 1.0 - abs(ai_primary_risk - clin_ml_score)
    # CONFIDENCE CALIBRATION: Higher trust in AI ensemble + input quality
    confidence_score = (agreement * 0.3) + (input_quality_score * 0.6) + (0.1 if len(final_disease_risks) >= 3 else 0.0)
    
    # User requested higher confidence/rely more on AI
    if ai_primary_risk > 0.5 and input_quality_score > 0.5:
        confidence_score = max(confidence_score, 0.75)

    confidence_tier = "high" if confidence_score >= 0.70 else ("moderate" if confidence_score >= 0.45 else "low")

    # Dynamic disease prediction count: If confidence is low, provide more alternatives (up to 8)
    final_disease_risks = sorted(final_disease_risks, key=lambda x: x["risk_percentage"], reverse=True)
    
    if confidence_tier == "low":
        max_predictions = 8
    elif confidence_tier == "moderate":
        max_predictions = 5
    else:
        max_predictions = 3

    if len(final_disease_risks) > max_predictions:
        final_disease_risks = final_disease_risks[:max_predictions]

    # ABSOLUTE LAST RESORT — system must NEVER return empty disease_risks
    if not final_disease_risks:
        logger.error("[InferenceAPI] Both AI and ML failed — serving hardcoded baseline disease_risks.")
        final_disease_risks = [
            {
                "disease": "General Respiratory Distress",
                "risk_percentage": 40,
                "reason": "Baseline respiratory risk flagged. Insufficient data or model unavailability prevented detailed analysis.",
                "severity": "moderate",
                "specialty": "General Physician",
            },
            {
                "disease": "Environmental Sensitivity",
                "risk_percentage": 25,
                "reason": "Potential AQI-related airway irritation based on submitted environmental data.",
                "severity": "moderate",
                "specialty": "General Physician",
            },
        ]

    result = {
        "model_version": "v5.0-hybrid-ensemble",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "final_risk_score": round(final_risk_score, 4),
        "confidence_score": round(confidence_score, 4),
        "confidence_tier": confidence_tier,
        "risk_category": "High Risk" if final_risk_score >= 0.65 else ("Moderate Risk" if final_risk_score >= 0.30 else "Low Risk"),
        "top_risk_factors": [f for f in [
            "Low SpO2" if patient_data.get('vitals', {}).get('spo2', 100) < 95 else None,
            "Reduced Inhaling Capacity" if inhale_capacity and inhale_capacity < 4 else None,
            "Reduced Exhaling Capacity" if exhale_capacity and exhale_capacity < 3 else None,
            "Reduced Breath Hold" if patient_data.get('vitals', {}).get('breath_hold_time', 60) < 20 else None,
            "Exertional Breathlessness" if stairs_difficulty in {"Moderate breathlessness", "Severe breathlessness"} else None,
            "High AQI Exposure" if env_dict.get('AQI', 0) > 100 else None,
            "Smoking History" if "smoker" in str(patient_data.get('lifestyle', {}).get('smoking_habits', '')).lower() else None
        ] if f],
        "disease_risks": final_disease_risks,
        "primary_prediction": final_disease_risks[0]["disease"] if final_disease_risks else "General Respiratory Distress",
        "ai_explanation": ai_explanation,
        "input_quality_score": round(input_quality_score, 2),
        "recommended_specialty": final_disease_risks[0]["specialty"] if final_disease_risks else "General Physician",
        "urgent_attention": any(d["severity"] == "high" for d in final_disease_risks) or final_risk_score > 0.75,
        "safety_flags": "Significant disagreement between clinical patterns and AI reasoning." if agreement < 0.4 else None,
        "medical_disclaimer": "This system provides AI-assisted insights and is NOT a medical diagnosis. Consult a doctor.",
        "recommended_doctors": [],
        "priority_recommendation": False
    }

    # Doctor Recommendations
    try:
        user_city = patient_data.get("city") or patient_data.get("location")
        target_disease = result["primary_prediction"]
        if target_disease:
            rec_result = get_doctors(disease=target_disease, city=user_city)
            recommended_list = rec_result.get("doctors", [])[:5]
            result["recommended_doctors"] = recommended_list
            result["priority_recommendation"] = result["urgent_attention"]
    except Exception as e:
        logger.error(f"Failed to fetch doctor recommendations: {e}")

    logger.info(f"Clinical Inference Completed for {user.id}: {len(result['disease_risks'])} diseases identified.")
    return result

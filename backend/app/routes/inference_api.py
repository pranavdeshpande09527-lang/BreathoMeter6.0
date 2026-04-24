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
                'Age': _to_float(patient_data.get('age'), 30),
                'Gender': patient_data.get('gender') or 'Other',
                'Smoking': patient_data.get('lifestyle', {}).get('smoking_habits') or 'Never',
                'AQI': _to_float(env_dict.get('AQI'), 50),
                'BMI': _to_float(patient_data.get('bmi'), 24.5),
                'SpO2': _to_float(patient_data.get('vitals', {}).get('spo2'), 98),
                'BreathHold': _to_float(patient_data.get('vitals', {}).get('breath_hold_time'), 45),
                'InhaleCapacity': _to_float(patient_data.get('vitals', {}).get('inhale_capacity'), 5),
                'ExhaleCapacity': _to_float(patient_data.get('vitals', {}).get('exhale_capacity'), 4)
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
        {{ "name": "Alternative Condition 1", "risk": 45, "reason": "Reasoning..." }}
      ], 
      "explanation": {{
        "summary": "Brief overview of the patient status.",
        "symptoms_flagged": ["Symptom 1", "Symptom 2"],
        "clinical_mapping": "How the symptoms and vitals map to the conditions."
      }}
    }}
    """
    
    ai_conditions = []
    ai_explanation = {
        "summary": "Reasoning analysis complete.",
        "symptoms_flagged": [],
        "clinical_mapping": "Conditions are identified based on clinical patterns."
    }
    ai_primary_risk = 0.0
    
    try:
        ai_data = await chatbot_service.get_ensemble_response(ai_prompt)
        ai_conditions = ai_data.get("conditions", [])
        ai_explanation_data = ai_data.get("explanation", {})
        if isinstance(ai_explanation_data, str):
            ai_explanation["summary"] = ai_explanation_data
        elif isinstance(ai_explanation_data, dict):
            ai_explanation = ai_explanation_data
        
        if ai_conditions:
            ai_primary_risk = float(ai_conditions[0].get("risk", 0)) / 100.0
    except Exception as e:
        logger.error(f"AI Reasoning logic failed: {e}")
        ai_explanation["summary"] = "AI reasoning service temporarily unavailable. Results based on clinical ML patterns."

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

    symptom_severity_score = min(1.0, respiratory_strain / 0.35)

    # --- 4. Hybrid Integration Layer ---
    integrated_map = {}
    
    ai_top_prediction = ai_conditions[0].get("name", "").lower().strip() if ai_conditions else ""
    ml_top_prediction = max(clinical_probs.items(), key=lambda x: x[1])[0].lower().strip() if clinical_probs else ""
    
    agreement_status = "no_match"
    if ml_top_prediction and ai_top_prediction and ml_top_prediction == ai_top_prediction:
        agreement_status = "strong_match"
    elif any(ml_top_prediction in ac.get("name", "").lower() or ac.get("name", "").lower() in ml_top_prediction for ac in ai_conditions):
        agreement_status = "partial_match"

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
        # NEW WEIGHTED BLEND: 60% AI, 25% ML, 10% Symptom Severity, 5% Environmental AQI
        if ai_r > 0 or ml_r > 0:
            blended = (0.60 * ai_r) + (0.25 * ml_r) + (0.10 * symptom_severity_score) + (0.05 * env_ml_score)
        else:
            blended = 0.0

        if blended > 0.01 or len(final_disease_risks) < 3:
            final_disease_risks.append({
                "condition_name": item["disease"],
                "probability": min(100, round(blended * 100)),
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
                "condition_name": m_name,
                "probability": min(100, round(m_prob * 100)),
                "reason": "Identified purely by statistical clinical models.",
                "severity": "high" if any(x in m_name.lower() for x in ["copd", "pneumonia", "cancer", "heart", "tuberculosis"]) else "moderate",
                "specialty": "General Physician"
            })

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
    final_disease_risks = sorted(final_disease_risks, key=lambda x: x["probability"], reverse=True)
    
    for condition in final_disease_risks:
        prob = condition.get("probability", 0)
        if prob >= 70:
            condition["confidence_label"] = "High"
        elif prob >= 40:
            condition["confidence_label"] = "Medium"
        else:
            condition["confidence_label"] = "Low"
            
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
        logger.error("[InferenceAPI] Both AI and ML failed — serving hardcoded baseline possible_conditions.")
        final_disease_risks = [
            {
                "condition_name": "General Respiratory Distress",
                "probability": 40,
                "reason": "Baseline respiratory risk flagged. Insufficient data or model unavailability prevented detailed analysis.",
                "severity": "moderate",
                "specialty": "General Physician",
                "confidence_label": "Low"
            },
            {
                "condition_name": "Environmental Sensitivity",
                "probability": 25,
                "reason": "Potential AQI-related airway irritation based on submitted environmental data.",
                "severity": "moderate",
                "specialty": "General Physician",
                "confidence_label": "Low"
            },
        ]
        
    # Determine Output Mode
    top_prob = final_disease_risks[0]["probability"] if final_disease_risks else 0
    if top_prob >= 70 and agreement_status == "strong_match":
        output_mode = "single"
    else:
        output_mode = "multi"

    # Urgency Classification System
    spo2 = _to_float(vitals.get('spo2', 100))
    if spo2 == 0:
        spo2 = 100 # If SpO2 is missing/0, assume healthy to avoid false emergency
        
    urgency_tier = "Low Risk"
    urgency_action = "Monitor your symptoms and maintain a healthy lifestyle."
    time_to_action = "Monitor and reassess"
    
    if (spo2 > 0 and spo2 < 90) or final_risk_score > 0.85 or stairs_difficulty == 'Severe breathlessness':
        urgency_tier = "Emergency"
        urgency_action = "Seek IMMEDIATE emergency medical attention. Call emergency services."
        time_to_action = "Immediate action (0-1 hour)"
    elif (spo2 > 0 and spo2 < 95) or final_risk_score >= 0.65:
        urgency_tier = "High Risk"
        urgency_action = "Seek medical attention promptly for a professional evaluation."
        time_to_action = "Within 24 hours"
    elif final_risk_score >= 0.30:
        urgency_tier = "Moderate Risk"
        urgency_action = "Consider a consult if symptoms persist or worsen."
        time_to_action = "Within 2-3 days"

    result = {
        "model_version": "v6.0-agreement-ensemble",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "final_risk_score": round(final_risk_score, 4),
        "confidence_score": round(confidence_score, 4),
        "confidence_tier": confidence_tier,
        "urgency_tier": urgency_tier,
        "urgency_action": urgency_action,
        "time_to_action": time_to_action,
        "top_risk_factors": [f for f in [
            "Low SpO2" if spo2 < 95 else None,
            "Reduced Inhaling Capacity" if inhale_capacity and inhale_capacity < 4 else None,
            "Reduced Exhaling Capacity" if exhale_capacity and exhale_capacity < 3 else None,
            "Reduced Breath Hold" if patient_data.get('vitals', {}).get('breath_hold_time') is not None and patient_data.get('vitals', {}).get('breath_hold_time') < 20 else None,
            "Exertional Breathlessness" if stairs_difficulty in {"Moderate breathlessness", "Severe breathlessness"} else None,
            "High AQI Exposure" if env_dict.get('AQI', 0) > 100 else None,
            "Smoking History" if "smoker" in str(patient_data.get('lifestyle', {}).get('smoking_habits', '')).lower() else None
        ] if f],
        "mode": output_mode,
        "agreement_status": agreement_status,
        "most_likely_condition": {
            "name": final_disease_risks[0]["condition_name"] if final_disease_risks else "General Respiratory Distress",
            "confidence": final_disease_risks[0]["probability"] if final_disease_risks else 40,
            "confidence_label": final_disease_risks[0].get("confidence_label", "Low"),
            "agreement": agreement_status
        },
        "alternatives": [
            {
                "name": dr["condition_name"],
                "probability": dr["probability"],
                "severity": dr["severity"],
                "reason": dr["reason"],
                "specialty": dr["specialty"]
            } for dr in (final_disease_risks if output_mode == "multi" else final_disease_risks[1:])
        ],
        "possible_conditions": final_disease_risks,  # Retained for backwards compatibility if needed
        "ai_explanation": ai_explanation,
        "input_quality_score": round(input_quality_score, 2),
        "recommended_specialty": final_disease_risks[0]["specialty"] if final_disease_risks else "General Physician",
        "urgent_attention": urgency_tier in ["Emergency", "High Risk"],
        "safety_flags": "Significant disagreement between clinical patterns and AI reasoning." if agreement < 0.4 else None,
        "medical_disclaimer": "This is an AI-based prediction and not a confirmed medical diagnosis. Consult a qualified doctor.",
        "disclaimer": "This is an AI-based prediction and not a confirmed medical diagnosis.",
        "recommended_doctors": [],
        "priority_recommendation": urgency_tier in ["Emergency", "High Risk"]
    }

    # Doctor Recommendations
    try:
        user_city = patient_data.get("city") or patient_data.get("location")
        target_disease = result["most_likely_condition"]["name"]
        if target_disease:
            rec_result = get_doctors(disease=target_disease, city=user_city)
            recommended_list = rec_result.get("doctors", [])[:5]
            result["recommended_doctors"] = recommended_list
            # Priority connects to urgent_attention, which handles Emergency/High Risk highlighting.
    except Exception as e:
        logger.error(f"Failed to fetch doctor recommendations: {e}")

    logger.info(f"Clinical Inference Completed for {getattr(user, 'id', 'anonymous')}: {len(result['possible_conditions'])} conditions identified.")
    return result

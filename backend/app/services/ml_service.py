import os
import joblib
import json
import numpy as np
from fastapi import HTTPException
from app.database import supabase_request

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml_models")
MODEL_PATH = os.path.join(MODEL_DIR, "respiratory_risk_model.pkl")
LABEL_ENCODER_PATH = os.path.join(MODEL_DIR, "label_encoder.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
FEATURE_ORDER_PATH = os.path.join(MODEL_DIR, "feature_order.json")

class MLService:
    def __init__(self):
        self.model = None
        self.encoder = None
        self.scaler = None
        self.feature_order = []
        self._load_assets()

    def _load_assets(self):
        """Loads the pre-trained model and preprocessing assets if they exist."""
        try:
            # ── RAM Guard ─────────────────────────────────────────────────────────
            # respiratory_risk_model.pkl is ~5.8 GB.  Free-tier hosts (Render 512 MB)
            # cannot load it.  We skip it when the file exceeds 1 GB so that the
            # rest of the inference pipeline (calibrated_model + clinical_diagnostic
            # + AI engine) continues to work normally.
            MAX_MODEL_BYTES = 1 * 1024 * 1024 * 1024  # 1 GB
            model_too_large = (
                os.path.exists(MODEL_PATH)
                and os.path.getsize(MODEL_PATH) > MAX_MODEL_BYTES
            )

            if model_too_large:
                print(
                    f"[MLService] Skipping respiratory_risk_model.pkl "
                    f"({os.path.getsize(MODEL_PATH) // (1024**3):.1f} GB) — "
                    "exceeds free-tier RAM limit. "
                    "Clinical + Environmental ML and AI engine remain active."
                )
                return
            # ──────────────────────────────────────────────────────────────────────

            if os.path.exists(MODEL_PATH) and os.path.exists(LABEL_ENCODER_PATH) and os.path.exists(SCALER_PATH):
                self.model = joblib.load(MODEL_PATH)
                self.encoder = joblib.load(LABEL_ENCODER_PATH)
                self.scaler = joblib.load(SCALER_PATH)
                if os.path.exists(FEATURE_ORDER_PATH):
                    with open(FEATURE_ORDER_PATH, "r") as f:
                        self.feature_order = json.load(f)
            else:
                print("ML models/assets not found. Predictions will be unavailable.")
        except Exception as e:
            print(f"Error loading ML assets: {e}")

    def _prepare_features(self, health_data: dict, breath_data: dict, aqi_exposure: float) -> np.ndarray:
        age = health_data.get('age', 40)
        gender = str(health_data.get('gender', 'unknown')).lower()
        is_male = 1.0 if gender == 'male' else 0.0
        
        smoking_history = str(health_data.get('smoking_history', 'False')).lower()
        is_smoker = 1.0 if smoking_history in ['true', 'yes', 'current'] else 0.0
        
        symptom_duration = health_data.get('symptom_duration', 0)
        
        # Map breath metrics or input to symptoms
        cough_severity = breath_data.get('cough_severity', 5) 
        shortness_of_breath = breath_data.get('shortness_of_breath', 5)
        
        bmi = health_data.get('bmi', 22.0)
        spo2_level = breath_data.get('spo2_level', 98.0)
        
        severity_index = (cough_severity * 0.5) + (shortness_of_breath * 0.5)
        severe_cough = 1.0 if cough_severity > 3 else 0.0

        feature_dict = {
            'age': float(age),
            'is_male': is_male,
            'is_smoker': is_smoker,
            'cough_severity': float(cough_severity),
            'shortness_of_breath': float(shortness_of_breath),
            'symptom_duration': float(symptom_duration),
            'bmi': float(bmi),
            'spo2_level': float(spo2_level),
            'aqi_exposure': float(aqi_exposure),
            'severity_index': float(severity_index),
            'severe_cough': severe_cough
        }

        features_array = []
        for feature in self.feature_order:
            features_array.append(feature_dict.get(feature, 0.0))
            
        return np.array([features_array])

    async def get_similar_cases(self, age: int, is_smoker: int, severe_cough: int, token: str = None) -> dict:
        """
        PHASE 15: CLINICAL GROUNDING (SIMILARITY LAYER) 
        Queries the datbase for matching patients with similar age, smoking status, and symptoms.
        """
        age_low = age - 5
        age_high = age + 5
        
        query_params = {
            "and": f"(age.gte.{age_low},age.lte.{age_high})",
            "select": "confirmed_diagnosis,smoking_status,cough_severity"
        }
        
        try:
            cases = await supabase_request(table="clinical_training_data", method="GET", query_params=query_params, token=token)
            
            if not cases:
                return {"count": 0, "distribution": {}}
                
            dist = {}
            filtered_cases = []
            for case in cases:
                # Extract case properties
                case_smoker = 1 if "current" in str(case.get("smoking_status", "")).lower() else 0
                case_cough = 1 if int(case.get("cough_severity", 0) or 0) > 3 else 0
                
                # Check symptom & risk similarity
                is_similar_smoker = (case_smoker == is_smoker)
                is_similar_cough = (case_cough == severe_cough)
                
                if is_similar_smoker or is_similar_cough:
                    filtered_cases.append(case)
                    dx = case.get("confirmed_diagnosis")
                    if dx:
                        dist[dx] = dist.get(dx, 0) + 1
            
            # Fallback to pure age-match if strict matching yields too few cases
            if len(filtered_cases) < 3:
                dist = {}
                for case in cases:
                    dx = case.get("confirmed_diagnosis")
                    if dx:
                        dist[dx] = dist.get(dx, 0) + 1
                return {
                    "count": len(cases),
                    "distribution": dist
                }
                
            return {
                "count": len(filtered_cases),
                "distribution": dist
            }
        except Exception as e:
            print(f"Failed to fetch similar cases: {e}")
            return {"count": 0, "distribution": {}}

    async def predict_risk(self, health_data: dict, breath_data: dict, aqi_exposure: float, token: str = None) -> dict:
        """
        Predict respiratory risk using calibrated probabilities and ensemble modeling.
        """
        if self.model is None or self.encoder is None or self.scaler is None:
            return {
                "status": "unavailable",
                "message": "Prediction unavailable. ML model not trained yet.",
                "prediction": "Unknown",
                "confidence": 0.0,
                "top_predictions": [],
                "model_type": "None",
                "similar_cases": 0,
                "similar_cases_distribution": {},
                "warnings": []
            }
            
        features_raw = self._prepare_features(health_data, breath_data, aqi_exposure)
        
        try:
            features_scaled = self.scaler.transform(features_raw)
            probas = self.model.predict_proba(features_scaled)[0]
            
            top_3_idx = np.argsort(probas)[-3:][::-1]
            classes = self.encoder.classes_
            
            top_predictions = []
            for idx in top_3_idx:
                top_predictions.append({
                    "disease": str(classes[idx]),
                    "confidence": round(float(probas[idx]), 4)
                })
                
            top_prediction = top_predictions[0]
            confidence = top_prediction['confidence']
            prediction_label = top_prediction['disease']
            
            age = int(health_data.get('age', 40))
            smoking_history = str(health_data.get('smoking_history', 'False')).lower()
            is_smoker = 1 if smoking_history in ['true', 'yes', 'current'] else 0
            severe_cough = 1 if int(breath_data.get('cough_severity', 5)) > 3 else 0
            
            sim_cases = await self.get_similar_cases(age, is_smoker, severe_cough, token=token)
            
            warnings_list = []
            # PHASE 16: FAIL-SAFE LOGIC
            if confidence < 0.6:
                prediction_label = f"LOW CONFIDENCE - Possible {prediction_label}"
                warnings_list.append("The model has low confidence in this specific prediction. We strongly advise consulting a General Physician.")
            
            # Check training data count roughly based on our similarity count logic or hardcode flag for this environment
            # Here we just check total rows from db if possible, or trigger it conservatively if sim_cases < 50
            if sim_cases["count"] < 100:
                warnings_list.append("Confidence reliability may be limited due to small reference dataset size.")
            
            return {
                "status": "success",
                "prediction": prediction_label,    # PHASE 14
                "confidence": confidence,          # PHASE 14
                "top_predictions": top_predictions, # PHASE 14
                "model_type": "ensemble_calibrated", # PHASE 14
                "similar_cases": sim_cases["count"], # PHASE 15
                "similar_cases_distribution": sim_cases["distribution"], # PHASE 15
                "warnings": warnings_list          # PHASE 16
            }
            
        except Exception as e:
            print(f"Prediction error: {e}")
            raise HTTPException(status_code=500, detail=f"Prediction error: {e}")

ml_service = MLService()

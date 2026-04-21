import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split

# --- Configuration ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "app", "ml_models")
os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODELS_DIR, "calibrated_model.pkl")
PREPROCESSOR_PATH = os.path.join(MODELS_DIR, "preprocessing_pipeline.pkl")

def generate_synthetic_data(n_samples=5000):
    """
    Generates synthetic environmental health data.
    Correlates high AQI and pollutants with a higher probability of 'Respiratory Risk' (class 1).
    """
    np.random.seed(42)
    
    # 1. Base Environmental Features
    aqi = np.random.uniform(20, 450, n_samples)
    pm2_5 = aqi * 0.6 + np.random.normal(0, 15, n_samples)
    pm10 = aqi * 1.2 + np.random.normal(0, 25, n_samples)
    no2 = np.random.uniform(5, 100, n_samples)
    so2 = np.random.uniform(2, 50, n_samples)
    o3 = np.random.uniform(10, 150, n_samples)
    temp = np.random.uniform(10, 45, n_samples)
    humidity = np.random.uniform(20, 90, n_samples)
    wind_speed = np.random.uniform(0, 30, n_samples)
    
    # 2. Impact Features
    respiratory_cases = (aqi / 100).astype(int) + np.random.poisson(2, n_samples)
    cardio_cases = (aqi / 150).astype(int) + np.random.poisson(1, n_samples)
    hospital_admissions = (respiratory_cases * 0.4).astype(int)
    health_impact_score = (aqi * 0.2) + (respiratory_cases * 1.5) + np.random.normal(0, 5, n_samples)
    
    data = pd.DataFrame({
        'AQI': aqi,
        'PM10': pm10,
        'PM2_5': pm2_5,
        'NO2': no2,
        'SO2': so2,
        'O3': o3,
        'Temperature': temp,
        'Humidity': humidity,
        'WindSpeed': wind_speed,
        'RespiratoryCases': respiratory_cases.astype(float),
        'CardiovascularCases': cardio_cases.astype(float),
        'HospitalAdmissions': hospital_admissions.astype(float),
        'HealthImpactScore': health_impact_score
    })
    
    # 3. Target Label (Risk)
    # Higher AQI and pollutanst = higher risk
    risk_score = (
        0.4 * (aqi / 500) + 
        0.3 * (pm2_5 / 300) + 
        0.2 * (health_impact_score / 150) + 
        np.random.normal(0, 0.1, n_samples)
    )
    y = (risk_score > 0.4).astype(int)
    
    return data, y

def train_and_save():
    print("Generating synthetic environmental data...")
    X, y = generate_synthetic_data()
    
    # Feature Engineering (must match inference_api.py:apply_feature_engineering)
    X['PollutionIndex'] = (X['PM2_5'] + X['PM10'] + X['NO2'] + X['SO2'] + X['O3']) / 5.0
    X['WeatherStress'] = X['Temperature'] * X['Humidity']
    X['PollutionHumidityInteraction'] = X['PM2_5'] * X['Humidity']
    
    # Match the column order expected by inference_api.py
    expected_cols = [
        'AQI', 'PM10', 'PM2_5', 'NO2', 'SO2', 'O3', 'Temperature', 'Humidity', 
        'WindSpeed', 'RespiratoryCases', 'CardiovascularCases', 'HospitalAdmissions', 
        'HealthImpactScore', 'PollutionIndex', 'WeatherStress', 'PollutionHumidityInteraction'
    ]
    X = X[expected_cols]
    
    print(f"Dataset shape: {X.shape}")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 1. Create Preprocessor (Scaling)
    print("Building preprocessor...")
    preprocessor = StandardScaler()
    preprocessor.fit(X_train) # In inference_api, good_feat_idx is used AFTER transform
    
    # 2. Train and Calibrate Model
    print("Training and calibrating model...")
    # Base model
    rf = RandomForestClassifier(n_estimators=100, max_depth=7, random_state=42)
    
    # Calibration is important because the API uses .predict_proba()
    calibrated_model = CalibratedClassifierCV(rf, method='sigmoid', cv=5)
    
    # The inference_api.py slices the output of the preprocessor:
    # X_env = preprocessor.transform(df_env)
    # X_env = X_env[:, good_feat_idx] # good_feat_idx = range(13)
    
    # So we must train the calibrated_model on the first 13 features of the scaled data
    X_train_scaled = preprocessor.transform(X_train)[:, :13]
    calibrated_model.fit(X_train_scaled, y_train)
    
    # 3. Save Assets
    print(f"Saving assets to {MODELS_DIR}...")
    joblib.dump(calibrated_model, MODEL_PATH)
    joblib.dump(preprocessor, PREPROCESSOR_PATH)
    
    print("Success: Environmental model assets generated.")

if __name__ == "__main__":
    train_and_save()

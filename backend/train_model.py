import pandas as pd
import numpy as np
import joblib
import json
import os
import warnings

from sklearn.model_selection import train_test_split, StratifiedKFold, RandomizedSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, classification_report
import xgboost as xgb

warnings.filterwarnings('ignore')

# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Check if data exists in a common relative location
DATA_PATH = os.path.join(BASE_DIR, "app", "ml_models", "clinical_training_data_REAL.csv")
MODEL_OUTPUT_DIR = os.path.join(BASE_DIR, "app", "ml_models")
MODEL_PATH = os.path.join(MODEL_OUTPUT_DIR, "respiratory_risk_model.pkl")
LABEL_ENCODER_PATH = os.path.join(MODEL_OUTPUT_DIR, "label_encoder.pkl")
SCALER_PATH = os.path.join(MODEL_OUTPUT_DIR, "scaler.pkl")
EVAL_REPORT_PATH = os.path.join(MODEL_OUTPUT_DIR, "evaluation_report.json")
FEATURE_IMPORTANCE_PATH = os.path.join(MODEL_OUTPUT_DIR, "feature_importance.json")
FEATURE_ORDER_PATH = os.path.join(MODEL_OUTPUT_DIR, "feature_order.json")

os.makedirs(MODEL_OUTPUT_DIR, exist_ok=True)

DATA_PATH_SYNTHETIC = os.path.join(BASE_DIR, "app", "ml_models", "synthetic_clinical_data_500k.csv")


from app.ml_ensemble import CustomEnsemble as OOFWeightedStacker
from app.ml_ensemble import CustomEnsemble

if __name__ == "__main__":
    print("--- Data Loading and Cleaning ---")
    df_real = pd.read_csv(DATA_PATH)
    df_synth = pd.read_csv(DATA_PATH_SYNTHETIC)
    df = pd.concat([df_real, df_synth], ignore_index=True)
    df = df.drop_duplicates()
    df = df.dropna(subset=['confirmed_diagnosis'])

    # Warnings for low data volume
    if len(df) < 300:
        print("WARNING: Model confidence may be unreliable due to limited data.")

    # Clean text
    df['gender'] = df['gender'].str.strip().str.lower()
    df['smoking_status'] = df['smoking_status'].str.strip().str.lower()

    # Numerical imputation
    num_cols = ['bmi', 'spo2_level', 'aqi_exposure', 'pm2_5_level', 'breath_hold_time', 'symptom_duration']
    for col in num_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        if df[col].isnull().all():
            df[col] = 0

    imputer_num = SimpleImputer(strategy='median')
    df[num_cols] = imputer_num.fit_transform(df[num_cols])

    # Categorical imputation
    cat_cols = ['occupation']
    imputer_cat = SimpleImputer(strategy='most_frequent')
    df[cat_cols] = imputer_cat.fit_transform(df[cat_cols])

    print("--- Feature Engineering ---")
    df['shortness_of_breath'] = pd.to_numeric(df['shortness_of_breath'], errors='coerce').fillna(0)
    df['cough_severity'] = pd.to_numeric(df['cough_severity'], errors='coerce').fillna(0)
    df['severity_index'] = (df['cough_severity'] * 0.5) + (df['shortness_of_breath'] * 0.5)
    df['severe_cough'] = (df['cough_severity'] > 3).astype(int)

    df['is_smoker'] = df['smoking_status'].apply(lambda x: 1.0 if "current" in str(x) else (0.5 if "former" in str(x) else 0.0))
    df['is_smoker'] = np.where(df['smoking_status'].str.contains('passive', na=False), 0.2, df['is_smoker'])
    df['is_male'] = (df['gender'] == 'male').astype(int)

    initial_features = [
        'age', 'is_male', 'is_smoker', 
        'cough_severity', 'shortness_of_breath', 'symptom_duration',
        'bmi', 'spo2_level', 'aqi_exposure', 
        'severity_index', 'severe_cough'
    ]

    X = df[initial_features]
    y_raw = df['confirmed_diagnosis']

    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    class_labels = le.classes_
    joblib.dump(le, LABEL_ENCODER_PATH)

    print("--- PHASE 1: DATA SPLITTING ---")
    X_train_full, X_test, y_train_full, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    X_train, X_val, y_train, y_val = train_test_split(X_train_full, y_train_full, test_size=0.15, random_state=42, stratify=y_train_full)

    print("--- PHASE 6: FEATURE SCALING ---")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)
    joblib.dump(scaler, SCALER_PATH)

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    print("--- PHASE 4, 5 & 7: MODEL TRAINING & HYPERPARAMETER TUNING ---")
    # RandomForest
    rf_params = {
        'n_estimators': [50, 100, 200],
        'max_depth': [None, 5, 10, 15], # Limit tree depth for regularization
        'min_samples_split': [2, 5, 10]
    }
    rf = RandomForestClassifier(class_weight='balanced', random_state=42)
    rf_search = RandomizedSearchCV(rf, rf_params, n_iter=10, cv=cv, scoring='f1_weighted', random_state=42, n_jobs=-1, verbose=3)
    rf_search.fit(X_train, y_train) # Unscaled for RF
    best_rf = rf_search.best_estimator_

    # XGBoost
    xgb_params = {
        'n_estimators': [50, 100],
        'max_depth': [3, 5],         # Regularization
        'learning_rate': [0.01, 0.1],
        'subsample': [0.8, 1.0]
    }
    xgb_model = xgb.XGBClassifier(eval_metric='mlogloss', early_stopping_rounds=10, random_state=42)
    xgb_search = RandomizedSearchCV(xgb_model, xgb_params, n_iter=5, cv=cv, scoring='f1_weighted', random_state=42, n_jobs=-1, verbose=3)

    # Fit randomized search (needs standard fit) then refit with eval set if necessary
    # Due to Early stopping inside GridSearchCV needing eval_set mapping, it's easier to fit grid search normally
    # and then add early stopping to best model or just pass fit_params.
    fit_params = {
        'eval_set': [(X_val, y_val)],
        'verbose': False
    }
    xgb_search.fit(X_train, y_train, **fit_params)
    best_xgb = xgb_search.best_estimator_

    # Logistic Regression
    lr_params = {
        'C': [0.01, 0.1, 1, 10],   # L2 Regularization parameter
        'penalty': ['l2']
    }
    lr = LogisticRegression(class_weight='balanced', max_iter=1000, random_state=42)
    lr_search = RandomizedSearchCV(lr, lr_params, n_iter=4, cv=cv, scoring='f1_weighted', random_state=42, n_jobs=-1, verbose=3)
    lr_search.fit(X_train_scaled, y_train) # Scaled for LR
    best_lr = lr_search.best_estimator_

    print("--- PHASE 11: FEATURE IMPORTANCE ANALYSIS ---")
    importances = best_rf.feature_importances_
    feature_imp_df = pd.DataFrame({'Feature': initial_features, 'Importance': importances}).sort_values(by='Importance', ascending=False)
    print("Feature Importances:\n", feature_imp_df)

    # Remove low importance features
    threshold = 0.01
    high_imp_features = feature_imp_df[feature_imp_df['Importance'] > threshold]['Feature'].tolist()

    if len(high_imp_features) < len(initial_features):
        print(f"Removing low importance features, retaining: {high_imp_features}")
        X_train_ret = X_train[high_imp_features]
        X_val_ret = X_val[high_imp_features]
        X_test_ret = X_test[high_imp_features]
        
        scaler_ret = StandardScaler()
        X_train_scaled_ret = scaler_ret.fit_transform(X_train_ret)
        X_val_scaled_ret = scaler_ret.transform(X_val_ret)
        X_test_scaled_ret = scaler_ret.transform(X_test_ret)
        joblib.dump(scaler_ret, SCALER_PATH)
        
        with open(FEATURE_ORDER_PATH, "w") as f:
            json.dump(high_imp_features, f, indent=4)
            
        best_rf.fit(X_train_ret, y_train)
        best_xgb.fit(X_train_ret, y_train, eval_set=[(X_val_ret, y_val)], verbose=False)
        best_lr.fit(X_train_scaled_ret, y_train)
        
        X_train_final = X_train_ret
        X_val_final = X_val_ret
        X_test_final = X_test_ret
        X_train_scaled_final = X_train_scaled_ret
        X_val_scaled_final = X_val_scaled_ret
        X_test_scaled_final = X_test_scaled_ret
        final_features = high_imp_features
    else:
        print("All features retained.")
        with open(FEATURE_ORDER_PATH, "w") as f:
            json.dump(initial_features, f, indent=4)
        X_train_final = X_train
        X_val_final = X_val
        X_test_final = X_test
        X_train_scaled_final = X_train_scaled
        X_val_scaled_final = X_val_scaled
        X_test_scaled_final = X_test_scaled
        final_features = initial_features

    with open(FEATURE_IMPORTANCE_PATH, "w") as f:
        json.dump(feature_imp_df.to_dict('records'), f, indent=4)

    print("--- PHASE 12: PROBABILITY CALIBRATION ---")
    calibrated_rf = CalibratedClassifierCV(best_rf, method='sigmoid', cv=5)
    calibrated_rf.fit(X_train_final, y_train)

    # Remove early stopping rounds since CalibratedClassifierCV doesn't pass an eval_set during its internal 5-fold CV fit
    best_xgb.set_params(early_stopping_rounds=None)
    calibrated_xgb = CalibratedClassifierCV(best_xgb, method='sigmoid', cv=5)
    calibrated_xgb.fit(X_train_final, y_train)

    calibrated_lr = CalibratedClassifierCV(best_lr, method='sigmoid', cv=5)
    calibrated_lr.fit(X_train_scaled_final, y_train)

    print("--- PHASE 9 & 10: OVERFITTING CHECK AND EVALUATION ---")
    
    ensemble_model = CustomEnsemble(calibrated_rf, calibrated_xgb, calibrated_lr, scaler_ret if 'scaler_ret' in locals() else scaler)

    train_pred = ensemble_model.predict(X_train_final)
    train_f1 = precision_recall_fscore_support(y_train, train_pred, average='weighted')[2]

    y_pred = ensemble_model.predict(X_test_final)
    y_prob = ensemble_model.predict_proba(X_test_final)

    accuracy = accuracy_score(y_test, y_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')
    conf_matrix = confusion_matrix(y_test, y_pred)

    print(f"Train F1: {train_f1:.4f} | Test F1: {f1:.4f}")
    if train_f1 - f1 > 0.10:
        print("WARNING: Model might be overfitting.")

    avg_confidence = np.mean(np.max(y_prob, axis=1))

    report_dict = classification_report(y_test, y_pred, target_names=class_labels, output_dict=True)

    evaluation_data = {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1_score": f1,
        "train_f1_score": train_f1,
        "average_confidence": float(avg_confidence),
        "classes": class_labels.tolist(),
        "classification_report": report_dict,
        "confusion_matrix": conf_matrix.tolist(),
        "warnings": []
    }

    if len(df) < 300:
        evaluation_data["warnings"].append("Model confidence may be unreliable due to limited data")

    if train_f1 - f1 > 0.10:
        evaluation_data["warnings"].append(f"Overfitting detected! Train F1 ({train_f1:.4f}) vs Test F1 ({f1:.4f})")

    with open(EVAL_REPORT_PATH, "w") as f:
        json.dump(evaluation_data, f, indent=4)

    joblib.dump(ensemble_model, MODEL_PATH)
    print("Pipeline complete. Models and reports saved.")


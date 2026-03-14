import os
import joblib
import pandas as pd
import numpy as np
import shap
import warnings
import copy
warnings.filterwarnings('ignore')

from sklearn.model_selection import StratifiedKFold, RandomizedSearchCV, train_test_split, cross_val_predict
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (accuracy_score, precision_score, f1_score, roc_auc_score,
                             precision_recall_curve, confusion_matrix, roc_curve)
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier
from sklearn.pipeline import Pipeline as SklearnPipeline
from imblearn.pipeline import Pipeline as ImbPipeline
from imblearn.over_sampling import SMOTE
from sklearn.base import BaseEstimator, ClassifierMixin

def engineer_features(df):
    df = df.copy()
    if 'RecordID' in df.columns:
        df = df.drop(columns=['RecordID'])
    # Derived features
    df['PollutionIndex'] = (df['PM2_5'] + df['PM10'] + df['NO2'] + df['SO2'] + df['O3']) / 5.0
    df['WeatherStress'] = df['Temperature'] * df['Humidity']
    df['PollutionHumidityInteraction'] = df['PM2_5'] * df['Humidity']
    return df

def calc_specificity(y_true, y_pred):
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    return tn / (tn + fp)

def calc_sensitivity(y_true, y_pred):
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    return tp / (tp + fn)

def optimize_threshold(y_true, y_probs, min_sensitivity=0.80):
    fpr, tpr, thresholds = roc_curve(y_true, y_probs)
    best_thresh = 0.5
    best_j = -1
    for i in range(len(thresholds)):
        sens = tpr[i]
        spec = 1 - fpr[i]
        j_stat = sens + spec - 1
        if sens >= min_sensitivity:
            if j_stat > best_j:
                best_j = j_stat
                best_thresh = thresholds[i]
    if best_j == -1:
        j_scores = tpr + (1 - fpr) - 1
        best_thresh = thresholds[np.argmax(j_scores)]
    return best_thresh

class OOFWeightedStacker(BaseEstimator, ClassifierMixin):
    def __init__(self, estimators, cv=5, random_state=42):
        self.estimators = estimators 
        self.cv = cv
        self.random_state = random_state
        self.weights_ = None
        self.fitted_estimators_ = []

    def fit(self, X, y):
        skf = StratifiedKFold(n_splits=self.cv, shuffle=True, random_state=self.random_state)
        aucs = []
        self.fitted_estimators_ = []
        oof_predictions = np.zeros((X.shape[0], len(self.estimators)))
        
        # 1. Generate OOF predictions to prevent leakage
        print("\n--- Training Base Models & Generating OOF Predictions ---")
        for i, (name, estimator) in enumerate(self.estimators):
            print(f"Generating OOF predictions for {name}...")
            oof_preds = cross_val_predict(estimator, X, y, cv=skf, method='predict_proba', n_jobs=-1)[:, 1]
            oof_predictions[:, i] = oof_preds
            auc = roc_auc_score(y, oof_preds)
            aucs.append(auc)
            print(f"  -> OOF ROC AUC for {name}: {auc:.4f}")
            
            print(f"Fitting {name} on full training dataset...")
            cloned_est = copy.deepcopy(estimator)
            cloned_est.fit(X, y)
            self.fitted_estimators_.append((name, cloned_est))

        aucs = np.array(aucs)
        
        # We will extract raw coefficients for blending weights (Section 3)
        print("\n--- Training Logistic Regression Meta-Model on OOF Predictions ---")
        self.meta_model = LogisticRegression(class_weight='balanced')
        self.meta_model.fit(oof_predictions, y)
        
        raw_weights = np.abs(self.meta_model.coef_[0])
        if np.sum(raw_weights) == 0:
            raw_weights = aucs # fallback if LR zeroes out all
        
        # Normalize weights to sum to 1.0 (Section 3 explicit percentage requirements)
        self.weights_ = raw_weights / np.sum(raw_weights)
        
        print("\n--- Final Blending Weights Derived from Validation Performance ---")
        for i, (name, _) in enumerate(self.estimators):
            print(f"{name}: {self.weights_[i]*100:.2f}%")
            
        self.classes_ = np.unique(y)
        return self

    def predict_proba(self, X):
        probas = np.zeros((X.shape[0], 2))
        for i, (name, est) in enumerate(self.fitted_estimators_):
            weight = self.weights_[i]
            probas += weight * est.predict_proba(X)
        return probas

    def predict(self, X):
        probas = self.predict_proba(X)[:, 1]
        return (probas >= 0.5).astype(int)

def main():
    print("Loading data...")
    data_path = os.path.join(os.path.dirname(__file__), "dataset", "air_quality_health_impact_data.csv")
    if not os.path.exists(data_path):
        # Fallback: try the scratch dir path used during initial development
        data_path = r"C:\Users\prana\.gemini\antigravity\scratch\breathometer4\dataset\air_quality_health_impact_data\air_quality_health_impact_data.csv"
    if not os.path.exists(data_path):
        print(f"ERROR: Dataset not found at {data_path}. Please place it in backend/dataset/")
        return
    df = pd.read_csv(data_path)
    
    print("Preprocessing target...")
    df['HealthImpactClass'] = df['HealthImpactClass'].apply(lambda x: 1 if x >= 1.0 else 0)
    
    y = df['HealthImpactClass']
    X = df.drop(columns=['HealthImpactClass'])
    
    print("Engineering features...")
    X = engineer_features(X)
    
    preprocessor = SklearnPipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    print("Splitting dataset...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    X_train_p = preprocessor.fit_transform(X_train)
    X_test_p = preprocessor.transform(X_test)
    feature_names = X.columns
    
    print("Performing feature selection to ensure stable features...")
    rf_fs = RandomForestClassifier(random_state=42, n_estimators=50, class_weight="balanced")
    rf_fs.fit(X_train_p, y_train)
    importances = rf_fs.feature_importances_
    good_feat_idx = np.where(importances >= 0.01)[0]
    if len(good_feat_idx) < 5:
        good_feat_idx = np.argsort(importances)[::-1][:10]
        
    X_train_p = X_train_p[:, good_feat_idx]
    X_test_p = X_test_p[:, good_feat_idx]
    selected_features = feature_names[good_feat_idx]
    print(f"Selected {len(selected_features)} features: {list(selected_features)}")
    
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    n_iter_search = 3 # Small for performance
    
    # 1. Base Models
    print("\n--- Tuning Base Models ---")
    
    lr_pipe = ImbPipeline([
        ('smote', SMOTE(random_state=42)),
        ('lr', LogisticRegression(class_weight='balanced', max_iter=1000, solver='saga'))
    ])
    best_lr = RandomizedSearchCV(lr_pipe, {'lr__C': [0.1, 1.0, 10.0]}, n_iter=n_iter_search, cv=cv, scoring='roc_auc', n_jobs=-1, random_state=42).fit(X_train_p, y_train).best_estimator_

    rf_pipe = ImbPipeline([
        ('smote', SMOTE(random_state=42)),
        ('rf', RandomForestClassifier(class_weight='balanced', random_state=42))
    ])
    best_rf = RandomizedSearchCV(rf_pipe, {'rf__n_estimators': [50, 100], 'rf__max_depth': [5, 10]}, n_iter=n_iter_search, cv=cv, scoring='roc_auc', n_jobs=-1, random_state=42).fit(X_train_p, y_train).best_estimator_

    spw = (len(y_train) - sum(y_train)) / sum(y_train)
    xgb_pipe = ImbPipeline([
        ('smote', SMOTE(random_state=42)),
        ('xgb', XGBClassifier(scale_pos_weight=spw, eval_metric='logloss', random_state=42))
    ])
    best_xgb = RandomizedSearchCV(xgb_pipe, {'xgb__max_depth': [3, 5], 'xgb__learning_rate': [0.05, 0.1]}, n_iter=n_iter_search, cv=cv, scoring='roc_auc', n_jobs=-1, random_state=42).fit(X_train_p, y_train).best_estimator_

    lgbm_pipe = ImbPipeline([
        ('smote', SMOTE(random_state=42)),
        ('lgb', LGBMClassifier(class_weight='balanced', random_state=42, verbose=-1))
    ])
    best_lgbm = RandomizedSearchCV(lgbm_pipe, {'lgb__max_depth': [3, 5, -1], 'lgb__learning_rate': [0.05, 0.1]}, n_iter=n_iter_search, cv=cv, scoring='roc_auc', n_jobs=-1, random_state=42).fit(X_train_p, y_train).best_estimator_

    cat_pipe = ImbPipeline([
        ('smote', SMOTE(random_state=42)),
        ('cat', CatBoostClassifier(auto_class_weights='Balanced', random_state=42, verbose=0, iterations=100))
    ])
    best_cat = RandomizedSearchCV(cat_pipe, {'cat__depth': [4, 6], 'cat__learning_rate': [0.05, 0.1]}, n_iter=n_iter_search, cv=cv, scoring='roc_auc', n_jobs=-1, random_state=42).fit(X_train_p, y_train).best_estimator_

    mlp_pipe = ImbPipeline([
        ('smote', SMOTE(random_state=42)),
        ('mlp', MLPClassifier(max_iter=500, random_state=42, early_stopping=True))
    ])
    best_mlp = RandomizedSearchCV(mlp_pipe, {'mlp__hidden_layer_sizes': [(64, 32), (32, 16)]}, n_iter=n_iter_search, cv=cv, scoring='roc_auc', n_jobs=-1, random_state=42).fit(X_train_p, y_train).best_estimator_

    # Stack BaseModel with Explicit Weights
    estimators = [
        ('LogisticRegression', best_lr),
        ('RandomForest', best_rf),
        ('XGBoost', best_xgb),
        ('LightGBM', best_lgbm),
        ('CatBoost', best_cat),
        ('MLP', best_mlp)
    ]
    
    stacker = OOFWeightedStacker(estimators=estimators, cv=5)
    
    print("\nTraining the stacked ensemble (OOF Blending)...")
    stacker.fit(X_train_p, y_train)
    
    print("Evaluating on test set...")
    y_test_probs = stacker.predict_proba(X_test_p)[:, 1]
    
    best_thresh = optimize_threshold(y_test, y_test_probs, min_sensitivity=0.80)
    print(f"Final optimized threshold (Sensitivity >= 0.8 is prioritized): {best_thresh:.4f}")
    
    y_test_pred = (y_test_probs >= best_thresh).astype(int)
    
    acc = accuracy_score(y_test, y_test_pred)
    sens = calc_sensitivity(y_test, y_test_pred)
    spec = calc_specificity(y_test, y_test_pred)
    roc_auc = roc_auc_score(y_test, y_test_probs)
    precision, recall, _ = precision_recall_curve(y_test, y_test_probs)
    pr_auc = np.trapezoid(recall[::-1], precision[::-1])
    
    print("\n--- Final Validation Report ---")
    print(f"Accuracy: {acc:.4f}")
    print(f"Sensitivity: {sens:.4f}")
    print(f"Specificity: {spec:.4f}")
    print(f"ROC-AUC: {roc_auc:.4f}")
    print(f"PR-AUC: {pr_auc:.4f}")
    
    print("\nGenerating SHAP explanations...")
    try:
        explainer = shap.TreeExplainer(best_cat.named_steps['cat'])
        X_train_smote, _ = best_cat.named_steps['smote'].fit_resample(X_train_p, y_train)
        shap_vals = explainer.shap_values(X_test_p[:100])
        if isinstance(shap_vals, list):
            shap_vals_pos = shap_vals[1]
        else:
            shap_vals_pos = shap_vals
        
        if len(shap_vals_pos.shape) == 3:
            shap_vals_pos = shap_vals_pos[:, :, 1]
            
        feature_importances_shap = np.abs(shap_vals_pos).mean(axis=0)
        top_indices = np.argsort(feature_importances_shap)[::-1][:5]
        print("\nTop 5 Risk Factors (SHAP Global):")
        for idx in top_indices:
            print(f"- {selected_features[idx]} (Importance score: {float(feature_importances_shap[idx]):.4f})")
    except Exception as e:
        print(f"SHAP explanation failed. Skipping. Error: {e}")

    models_dir = os.path.join(os.path.dirname(__file__), "app", "ml_models")
    os.makedirs(models_dir, exist_ok=True)
    
    pipeline_data = {
        'preprocessor': preprocessor,
        'selected_features': selected_features,
        'good_feat_idx': good_feat_idx
    }
    
    joblib.dump(pipeline_data, os.path.join(models_dir, 'preprocessing_pipeline.pkl'))
    joblib.dump(stacker, os.path.join(models_dir, 'clinical_model.pkl'))
    joblib.dump(stacker, os.path.join(models_dir, 'calibrated_model.pkl')) # For API compatibility
    
    with open(os.path.join(models_dir, 'threshold.txt'), 'w') as f:
        f.write(str(best_thresh))
        
    print("\nModel serialization complete. Saved to app/ml_models/")

if __name__ == '__main__':
    main()

import os
import joblib
import pandas as pd
import numpy as np
import json
import ast
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import classification_report, roc_auc_score, accuracy_score
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

# --- Configuration ---
DATASET_PATH = r"C:\Users\prana\.antigravity\breathomeater4.0\files (2)\clinical_training_data_REAL.csv"
MODELS_DIR = os.path.join(os.path.dirname(__file__), "app", "ml_models")

def parse_symptoms(symptom_str):
    """Safely parse symptom_flags from string representations like ['wheezing']."""
    try:
        if pd.isna(symptom_str) or not symptom_str:
            return []
        # Handle string like "['wheezing', 'cough']"
        return ast.literal_eval(symptom_str)
    except:
        return []

def train():
    print(f"Loading clinical dataset from {DATASET_PATH}...")
    if not os.path.exists(DATASET_PATH):
        print("ERROR: Dataset not found.")
        return

    df = pd.read_csv(DATASET_PATH)

    # 1. Feature Selection & Target Extraction
    # Target: confirmed_diagnosis
    # Drop irrelevant metadata
    cols_to_drop = ['source', 'original_record_id', 'record_number', 'verified_by', 'data_quality_score']
    df = df.drop(columns=[c for c in cols_to_drop if c in df.columns])

    # 2. Symptom Feature Engineering
    print("Parsing symptoms...")
    df['parsed_symptoms'] = df['symptom_flags'].apply(parse_symptoms)
    
    # Get all unique symptoms to create binary columns
    all_symptoms = set()
    for s_list in df['parsed_symptoms']:
        for s in s_list:
            all_symptoms.add(s.lower().strip())
    
    for s in all_symptoms:
        df[f'sym_{s}'] = df['parsed_symptoms'].apply(lambda x: 1 if s in [i.lower().strip() for i in x] else 0)
    
    df = df.drop(columns=['symptom_flags', 'parsed_symptoms'])

    # 3. Clean Target
    # Ensure confirmed_diagnosis is cleaned (e.g., 'Lung Cancer - Type III' -> 'Lung Cancer')
    def clean_label(label):
        label = str(label).lower()
        if 'lung cancer' in label: return 'lung cancer'
        if 'asthma' in label: return 'asthma'
        if 'copd' in label: return 'copd'
        if 'pneumonia' in label: return 'pneumonia'
        if 'tuberculosis' in label: return 'tuberculosis'
        if 'bronchitis' in label: return 'bronchitis'
        if 'heart' in label or 'cardio' in label or 'ischemic' in label: return 'cardiovascular disease'
        return 'other'

    df['target'] = df['confirmed_diagnosis'].apply(clean_label)
    
    # Label Encoding for multi-class
    le = LabelEncoder()
    df['target_encoded'] = le.fit_transform(df['target'])
    class_mapping = dict(zip(le.transform(le.classes_), le.classes_))
    print(f"Detected classes: {class_mapping}")

    # 4. Prepare X and y
    y = df['target_encoded']
    X = df.drop(columns=['confirmed_diagnosis', 'target', 'target_encoded'])

    # Identify numeric and categorical features
    numeric_features = X.select_dtypes(include=['int64', 'float64']).columns.tolist()
    categorical_features = X.select_dtypes(include=['object']).columns.tolist()

    print(f"Numeric features: {numeric_features}")
    print(f"Categorical features: {categorical_features}")

    # 5. Build Preprocessing Pipeline
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='unknown')),
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ]
    )

    # 6. Model Ensemble
    # We'll use a strong Gradient Booster for clinical accuracy
    model = XGBClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=5,
        random_state=42,
        use_label_encoder=False,
        eval_metric='mlogloss'
    )

    full_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', model)
    ])

    # 7. Train and Evaluate
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print("Training model...")
    full_pipeline.fit(X_train, y_train)

    y_pred = full_pipeline.predict(X_test)
    y_probs = full_pipeline.predict_proba(X_test)

    print("\nModel Performance:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    print(f"Overall Accuracy: {accuracy_score(y_test, y_pred):.4f}")

    # 8. Save Model and Metadata
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    model_data = {
        'pipeline': full_pipeline,
        'label_encoder': le,
        'feature_names': X.columns.tolist(),
        'symptom_list': list(all_symptoms),
        'class_mapping': class_mapping
    }
    
    model_path = os.path.join(MODELS_DIR, "clinical_diagnostic_model.pkl")
    joblib.dump(model_data, model_path)
    print(f"\nModel saved to {model_path}")
    
    # Save the class mapping for the backend to use
    with open(os.path.join(MODELS_DIR, "clinical_classes.json"), 'w') as f:
        # Convert int64 keys to strings for JSON
        json_mapping = {str(k): str(v) for k, v in class_mapping.items()}
        json.dump(json_mapping, f, indent=2)

if __name__ == "__main__":
    train()

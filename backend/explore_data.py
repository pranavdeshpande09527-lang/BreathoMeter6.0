import pandas as pd

df = pd.read_csv(r'C:\Users\prana\.antigravity\breathomeater4.0\files (2)\clinical_training_data_REAL.csv')
print("--- Columns and Non-Null Counts ---")
print(df.info())
print("\n--- Unique Values for Categoricals ---")
for col in ['gender', 'smoking_status', 'confirmed_diagnosis']:
    print(f"\n{col}:")
    print(df[col].value_counts(dropna=False))
print("\n--- Missing Values Strategy Check ---")
print(df.isna().sum())

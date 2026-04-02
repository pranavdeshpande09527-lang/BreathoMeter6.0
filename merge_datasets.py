import pandas as pd
import os
import json
import numpy as np

def merge_doctor_datasets():
    enriched_file = r"c:\Users\prana\.antigravity\breathomeater4.0\BreathoMeter5.0\maharashtra_doctors_enriched.xlsx"
    v3_file = r"C:\Users\prana\.antigravity\doctors_dataset_maharashtra_v3.xlsx"
    output_xlsx = r"c:\Users\prana\.antigravity\breathomeater4.0\BreathoMeter5.0\maharashtra_doctors_master.xlsx"
    output_json = r"c:\Users\prana\.antigravity\breathomeater4.0\BreathoMeter5.0\maharashtra_doctors_master.json"

    # Enriched mapping
    enriched_rename = {
        "Specialisation": "Specialty",
        "Hospital / Clinic": "Hospital / Clinic Name",
        "Experience (Yrs)": "Exp (Yrs)",
        "Contact (Hospital)": "Hospital Phone",
        "Full Address": "Hospital Address"
    }
    
    dfs = []
    if os.path.exists(enriched_file):
        df1 = pd.read_excel(enriched_file)
        df1 = df1.rename(columns=enriched_rename)
        dfs.append(df1)
        
    if os.path.exists(v3_file):
        df2 = pd.read_excel(v3_file)
        dfs.append(df2)
        
    if not dfs:
        print("No files found.")
        return

    combined_df = pd.concat(dfs, ignore_index=True)
    
    # Clean string columns
    str_cols = ['Doctor Name', 'City', 'Specialty', 'Hospital / Clinic Name', 'Hospital Address', 'Exp (Yrs)', 'Rating %']
    for col in str_cols:
        if col in combined_df.columns:
            combined_df[col] = combined_df[col].astype(str).str.strip()
            # If it became "nan" due to astype(str), make it None later

    # Deduplicate
    combined_df['DEDUP_KEY'] = (combined_df['Doctor Name'].str.lower() + "|" + combined_df['Hospital / Clinic Name'].str.lower())
    combined_df = combined_df.drop_duplicates(subset=['DEDUP_KEY'], keep='first')
    combined_df = combined_df.drop(columns=['DEDUP_KEY'])
    
    combined_df = combined_df.sort_values(['City', 'Doctor Name'])
    combined_df['#'] = range(1, len(combined_df) + 1)
    
    # Final cleanup before JSON
    # Convert all NaN to None (null in JSON)
    # Using replace instead of where for better reliability in some pandas versions
    final_df = combined_df.replace({np.nan: None})
    
    # Also handle string "nan" that might have happened in str() conversion
    for col in str_cols:
        if col in final_df.columns:
            final_df.loc[final_df[col] == "nan", col] = None
    
    json_records = final_df.to_dict(orient='records')
    
    # Ensure no NaN is dumped! Use a safer method or just trust None -> null
    with open(output_json, 'w', encoding='utf-8') as f:
        # allow_nan=False will raise an error if any NaN slips through! This protects the integrity.
        try:
            json.dump(json_records, f, indent=4, ensure_ascii=False, allow_nan=False)
        except ValueError as e:
            print(f"Error during JSON dump: {e}")
            # Try once more with a brute-force approach to clean NaN
            def clean_nan(obj):
                if isinstance(obj, list):
                    return [clean_nan(i) for i in obj]
                if isinstance(obj, dict):
                    return {k: clean_nan(v) for k, v in obj.items()}
                if isinstance(obj, float) and np.isnan(obj):
                    return None
                return obj
            json.dump(clean_nan(json_records), f, indent=4, ensure_ascii=False)

    final_df.to_excel(output_xlsx, index=False)
    print(f"Master dataset created successfully. Fixed JSON 'NaN' issues.")

if __name__ == "__main__":
    merge_doctor_datasets()

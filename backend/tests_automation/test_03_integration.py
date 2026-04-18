import requests

def test_inference_pipeline_valid_data(base_url, auth_headers):
    """Phase 3: Integration - Test the heavy ML / AI pipeline execution with actual vectors."""
    url = f"{base_url}/inference/predict?expand=true"
    payload = {
        "environmental_data": {
            "AQI": 150,
            "PM10": 100,
            "PM2_5": 75,
            "NO2": 30,
            "SO2": 20,
            "O3": 40,
            "Temperature": 28,
            "Humidity": 65,
            "WindSpeed": 8,
            "RespiratoryCases": 25,
            "CardiovascularCases": 10,
            "HospitalAdmissions": 5,
            "HealthImpactScore": 70
        },
        "optional_patient_data": {
            "age": 45,
            "gender": "Male",
            "symptoms": ["shortness_of_breath", "cough"],
            "lifestyle": {"smoking_habits": "Current"},
            "vitals": {
                "spo2": 92,
                "breath_hold_time": 25,
                "inhale_capacity": 3,
                "exhale_capacity": 3
            }
        }
    }
    
    res = requests.post(url, json=payload, headers=auth_headers, timeout=60)
    
    # 200 OK means the FastAPI layers successfully talked to ML + Supabase + LLMs
    assert res.status_code == 200, f"Inference pipeline failed: {res.text}"
    
    data = res.json()
    
    # Validate structure mapping integration
    assert "final_risk_score" in data or "disease_risks" in data, "Expected Risk outcome keys missing"
    assert "ai_explanation" in data or "recommended_doctors" in data, "Expected LLM interpretation keys missing"

def test_inference_pipeline_boundary_values(base_url, auth_headers):
    """Phase 6: Data Validation - Test AQI 500 boundary value correctly handled."""
    url = f"{base_url}/inference/predict?expand=true"
    payload = {
        "environmental_data": {
            "AQI": 500,  # Extreme Bound
            "PM10": 300,
            "PM2_5": 250,
            "NO2": 150,
            "SO2": 100,
            "O3": 120,
            "Temperature": 40,
            "Humidity": 80,
            "WindSpeed": 1,
            "RespiratoryCases": 200,
            "CardiovascularCases": 100,
            "HospitalAdmissions": 50,
            "HealthImpactScore": 100
        },
        "optional_patient_data": {}
    }
    
    res = requests.post(url, json=payload, headers=auth_headers, timeout=60)
    assert res.status_code in [200, 422], "Should compute inference or cleanly validate boundaries."

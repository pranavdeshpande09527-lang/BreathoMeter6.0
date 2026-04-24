const fetch = require('node-fetch');

async function testApi() {
  const TEST_USER = {
    username: `e2e_user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    password: 'Password123!',
    full_name: 'E2E Test User',
    role: 'patient',
    date_of_birth: '1990-01-01',
    gender: 'Other'
  };

  const signupRes = await fetch('https://breathometer6-0.onrender.com/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER)
  });
  
  const signupJson = await signupRes.json();
  const token = signupJson.session?.access_token || signupJson.access_token;
  
  if (!token) {
    console.error("Signup failed:", signupJson);
    return;
  }

  const payload = {
    "environmental_data": {
      "AQI": 150,
      "PM10": 20,
      "PM2_5": 12,
      "NO2": 15,
      "SO2": 5,
      "O3": 25,
      "Temperature": 25,
      "Humidity": 50,
      "WindSpeed": 5,
      "RespiratoryCases": 5,
      "CardiovascularCases": 2,
      "HospitalAdmissions": 1,
      "HealthImpactScore": 20
    },
    "optional_patient_data": {
      "age": 65,
      "gender": "Male",
      "symptoms": ["Even while resting", "> 3 weeks", "Persistent cough", "Constantly", "Severe frequent episodes"],
      "medical_history": [],
      "smoking_history": "Current",
      "symptom_duration": "> 3 weeks",
      "bmi": 24.5,
      "lifestyle": {
        "smoking_habits": "Current",
        "outdoor_time_hours": "0-2"
      },
      "vitals": {
        "spo2": 98,
        "spo2_level": 98,
        "breath_hold_time": null,
        "inhale_capacity": null,
        "exhale_capacity": null,
        "average_signal_stability": 90,
        "average_peak_airflow": 5,
        "cough_severity": 5,
        "shortness_of_breath": 5,
        "stairs_difficulty": null
      },
      "respiratory_metrics": {
        "inhale_capacity_seconds": null,
        "exhale_capacity_seconds": null,
        "breath_hold_seconds": null,
        "stairs_difficulty": null
      }
    }
  };

  const res = await fetch('https://breathometer6-0.onrender.com/inference/predict', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  
  const data = await res.json();
  require('fs').writeFileSync('test_output.json', JSON.stringify({ status: res.status, data: data }, null, 2));
  console.log("Status:", res.status);
  console.log("Output written to test_output.json");
}

testApi();

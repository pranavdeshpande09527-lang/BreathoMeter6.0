import fetch from 'node-fetch';
import fs from 'fs';

async function run() {
    const signupData = {
        username: `critical_demo_${Date.now()}`,
        password: 'Password123!',
        full_name: 'Critical Test Patient',
        role: 'patient'
    };
    
    // 1. Signup on PROD
    const baseURL = 'http://localhost:8001';
    const signupRes = await fetch(`${baseURL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData)
    });
    
    const signupJson = await signupRes.json();
    console.log("Signup status:", signupRes.status);
    
    let token = '';
    if (signupRes.status === 200 || signupRes.status === 201) {
        token = signupJson.access_token || signupJson.session?.access_token;
    } else if (signupRes.status === 400 && (signupJson.detail === "Username already registered" || signupJson.detail === "Username already registered.")) {
        console.log("Account already exists, logging in...");
        const loginRes = await fetch(`${baseURL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                username: signupData.username,
                password: signupData.password
            })
        });
        const loginJson = await loginRes.json();
        console.log("Login JSON:", loginJson);
        token = loginJson.access_token;
    } else {
        console.error("Signup failed", signupJson);
        return;
    }
    
    // 2. Prediction request for a critical condition
    const payload = {
        environmental_data: {
            AQI: 250, // Hazardous
            PM10: 150,
            PM2_5: 200,
            NO2: 80,
            SO2: 40,
            O3: 100,
            Temperature: 35,
            Humidity: 90,
            WindSpeed: 5,
            RespiratoryCases: 50,
            CardiovascularCases: 30,
            HospitalAdmissions: 20,
            HealthImpactScore: 90
        },
        optional_patient_data: {
            vitals: {
                spo2: 84, // Very low oxygen
                breath_hold_time: 4, // Very short
                inhale_capacity: 10,
                exhale_capacity: 10,
                cough_severity: 5 // Max severity
            },
            medical_history: ["Asthma", "Hypertension"],
            symptoms: ["Severe shortness of breath", "Chest pain", "High fever", "Cyanosis"],
            symptom_duration: "3 days",
            age: 45,
            gender: "Male",
            lifestyle: {
                smoking_habits: "Smoker",
                activity_level: "Sedentary"
            },
            respiratory_metrics: {
                pef: 300,
                fev1: 2.5,
                fvc: 3.5
            }
        }
    };
    
    const predRes = await fetch(`${baseURL}/inference/predict?expand=true`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
    });
    
    console.log("Prediction status:", predRes.status);
    
    // Store it in history just like the frontend does
    const predData = await predRes.json();
    console.log("Prediction Data:", JSON.stringify(predData, null, 2));
    
    const storeRes = await fetch(`${baseURL}/prediction/store`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
             final_risk_score: predData.final_risk_score || 1.0,
             risk_category: predData.urgency_tier || "High Risk",
             ai_explanation: typeof predData.ai_explanation === 'string' ? predData.ai_explanation : JSON.stringify(predData.ai_explanation),
             top_risk_factors: predData.top_risk_factors || [],
             prediction_details: predData
        })
    });
    console.log("Store status:", storeRes.status);
}
run();

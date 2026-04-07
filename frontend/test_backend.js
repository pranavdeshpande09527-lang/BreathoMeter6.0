const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function run() {
    const signupData = {
        email: `test${Date.now()}@test.com`,
        password: 'Password123!',
        full_name: 'Test Node'
    };
    
    // 1. Signup
    const signupRes = await fetch('http://localhost:8000/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData)
    });
    
    const signupJson = await signupRes.json();
    console.log("Signup:", signupRes.status, signupJson);
    
    if (signupRes.status !== 200) return;
    const token = signupJson.access_token || signupJson.session?.access_token;
    
    // 2. Breath Test
    const breathRes = await fetch('http://localhost:8000/breath-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            lung_capacity: 30,
            breath_duration: 10,
            breath_strength: 20,
            test_accuracy: 95.0,
            peak_airflow: 0,
            signal_stability: 0,
            is_valid: true,
            background_noise_detected: false,
            cough_detected: false,
            raw_attempts: []
        })
    });
    console.log("Breath:", breathRes.status, await breathRes.text());
    
    // 3. Prediction
    const predRes = await fetch('http://localhost:8000/prediction/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            final_risk_score: 0.75,
            risk_category: "High Risk",
            ai_explanation: "Test",
            top_risk_factors: ["Smoking", "Age"]
        })
    });
    console.log("Prediction:", predRes.status, await predRes.text());
}
run();

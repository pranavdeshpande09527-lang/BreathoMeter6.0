const fs = require('fs');

async function testSupabase() {
    const url = "https://vgfodjbaoqngncifhqic.supabase.co/rest/v1/risk_predictions";
    const key = "sb_publishable_-Fi1fwlA7TIc5jNsKcWN9w_igckreRh";

    // Try to insert a garbage row to see schema errors
    const body = JSON.stringify({
        user_id: "00000000-0000-0000-0000-000000000000",
        final_risk_score: 0.5,
        predicted_condition: "Test",
        risk_category: "Test",
        ai_explanation: "Test",
        top_risk_factors: ["A"]
    });

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Prefer': 'return=representation'
            },
            body: body
        });
        const data = await res.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch(e) {
        console.log("Error:", e.message);
    }
}
testSupabase();

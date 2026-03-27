import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.chatbot_service import chatbot_service

async def test_ensemble():
    prompt = """
You are an advanced clinical AI specializing in environmental health, air pollution exposure, and related respiratory and cardiovascular diseases.

Your goal is to generate a HIGH-CONFIDENCE, medically logical risk assessment based strictly on the given data.

-------------------------------------
INPUT DATA
-------------------------------------
Environmental Data:
- AQI: 150
- PM2.5: 85
- PM10: 50
- NO2: 40
- SO2: 10
- CO: 5
- O3: 60

Patient Data:
- Age: 45
- Gender: Male
- Symptoms: Mild cough, shortness of breath on exertion
- Smoking Status: Former smoker (quit 5 years ago)
- Medical History: Hypertension
- Exposure Duration: 2 hours/day

-------------------------------------
TASK
-------------------------------------
1. Identify the MOST LIKELY pollution-related diseases affecting this individual.
   - Focus ONLY on respiratory and cardiovascular conditions
   - DO NOT use any predefined or fixed disease list
   - Only include conditions that are strongly supported by the data

2. Assign a realistic risk percentage (0-100) for each condition based on:
   - Pollution severity (AQI and pollutants)
   - Pollutant-specific effects (e.g., PM2.5 -> lung inflammation, NO2 -> cardiovascular stress)
   - Patient vulnerability (age, smoking, medical history)
   - Symptom correlation

3. For EACH condition provide clear clinical reasoning:
   - Explicitly explain: pollutant -> biological effect -> disease
   - Connect symptoms (if present)
   - Avoid repetition across conditions

4. Provide a detailed overall explanation:
   - Identify the most harmful pollutants in this case
   - Explain short-term vs long-term health impact
   - Highlight the strongest risk drivers

-------------------------------------
STRICT RULES (ANTI-HALLUCINATION)
-------------------------------------
- DO NOT generate rare, unrelated, or unsupported diseases
- DO NOT guess if data is insufficient
- If uncertain, LOWER the risk score instead of inventing conditions
- DO NOT use generic statements like "air pollution is harmful"
- Each condition MUST have unique reasoning
- Be conservative and clinically realistic

-------------------------------------
CONSISTENCY & CONFIDENCE GUIDELINES
-------------------------------------
- Only include conditions that you are reasonably confident about
- Exclude conditions with weak or no evidence from the data
- Prefer common pollution-related diseases over rare ones
- Ensure the output is stable and not overly sensitive to minor data variations

-------------------------------------
OUTPUT CONSTRAINTS
-------------------------------------
- Include ONLY top 4-6 conditions
- Exclude any condition with risk < 20%
- Keep reasoning concise but meaningful (2-3 lines per condition)
- Overall explanation should be 5-8 lines

-------------------------------------
OUTPUT FORMAT (STRICT JSON ONLY)
-------------------------------------
{
  "conditions": [
    {
      "name": "Condition name",
      "risk": 0,
      "reason": "Specific clinical reasoning (pollutant -> effect -> disease)"
    }
  ],
  "explanation": "Detailed clinical explanation covering pollutants, risks, and impact"
}
    """
    
    print("Sending request to ensemble model...")
    try:
        result = await chatbot_service.get_ensemble_response(prompt)
        print("\n--- Final Prediction Result ---")
        if not result:
            print("Result is None")
            return
            
        print("\nExplanation:")
        print(result.get('explanation'))
        print("\nDisease Risks:")
        for dr in result.get('conditions', []):
            print(f"- {dr.get('name')}: {dr.get('risk')}%")
            if 'reason' in dr and dr['reason']:
                print(f"  Reason: {dr['reason']}")
    except Exception as e:
        print(f"Error during test: {e}")

if __name__ == "__main__":
    asyncio.run(test_ensemble())

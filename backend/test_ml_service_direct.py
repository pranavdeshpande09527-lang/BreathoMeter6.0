import asyncio
from app.services.ml_service import MLService
import json

async def main():
    service = MLService()
    
    health_data = {
        'age': 45, 
        'height': 175.0, 
        'weight': 85.0,
        'gender': 'Male',
        'smoking_history': True, 
        'activity_level': 'Low',
        'bmi': 27.7
    }
    breath_data = {
        'cough_severity': 7,
        'shortness_of_breath': 6,
        'spo2_level': 94.0
    }
    aqi_exposure = 150.0
    
    # Needs to connect to Supabase
    print("Testing locally initialized ML model...")
    prediction = await service.predict_risk(health_data, breath_data, aqi_exposure)
    print(json.dumps(prediction, indent=2))

if __name__ == "__main__":
    asyncio.run(main())

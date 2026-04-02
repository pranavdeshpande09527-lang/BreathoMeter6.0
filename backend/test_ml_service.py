import asyncio
from app.services.ml_service import ml_service

async def test_prediction():
    health_data = {
        'age': 55,
        'gender': 'Male',
        'smoking_history': 'Current',
        'bmi': 25.0
    }
    breath_data = {
        'cough_severity': 6,
        'shortness_of_breath': 5,
        'spo2_level': 92
    }
    aqi_exposure = 150.0
    
    res = await ml_service.predict_risk(health_data, breath_data, aqi_exposure)
    print("Prediction Response:")
    print(res)

if __name__ == "__main__":
    asyncio.run(test_prediction())

from locust import HttpUser, task, between

class BreathometerPerformanceUser(HttpUser):
    # Base configuration for Phase 5 Load Testing
    wait_time = between(1, 3) 
    
    # Mock JWT - Provide an actual active JWT if the load test includes authenticated endpoints
    auth_headers = {}
    
    @task(3)
    def test_health(self):
        """Standard Liveness probe benchmark"""
        self.client.get("/health")
        
    @task(1)
    def test_inference_prediction(self):
        """Stress testing ML model inference bounds (Critical)"""
        payload = {
            "environmental_data": {
                "AQI": 120,
                "PM10": 80,
                "PM2_5": 60,
                "NO2": 20,
                "SO2": 10,
                "O3": 30,
                "Temperature": 25,
                "Humidity": 60,
                "WindSpeed": 5,
                "RespiratoryCases": 10,
                "CardiovascularCases": 5,
                "HospitalAdmissions": 2,
                "HealthImpactScore": 50
            },
            "optional_patient_data": {
                "age": 30,
                "gender": "Male",
                "symptoms": ["cough"],
                "lifestyle": {"smoking_habits": "Never"},
                "vitals": {
                    "spo2": 98,
                    "breath_hold_time": 45,
                    "inhale_capacity": 5,
                    "exhale_capacity": 4
                }
            }
        }
        
        # Will return HTTP 401 if unauthenticated without setup, but allows measuring rate limits
        self.client.post("/inference/predict", json=payload, headers=self.auth_headers)

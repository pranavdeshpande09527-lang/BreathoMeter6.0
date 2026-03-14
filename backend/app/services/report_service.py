from fastapi import HTTPException
from app.database import supabase_request
from typing import Optional

class ReportService:
    async def generate_json_report(self, user_id: str) -> dict:
        """
        Gathers all user metrics to create a comprehensive JSON report.
        """
        try:
            # Fetch latest health data
            health_res = await supabase_request("health_data", "GET", query_params={"user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": "1"})
            health_data = health_res[0] if health_res else None

            # Fetch latest breath test
            breath_res = await supabase_request("breath_tests", "GET", query_params={"user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": "1"})
            breath_data = breath_res[0] if breath_res else None

            # Fetch latest prediction
            pred_res = await supabase_request("risk_predictions", "GET", query_params={"user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": "1"})
            prediction_data = pred_res[0] if pred_res else None

            return {
                "user_id": user_id,
                "health_profile": health_data,
                "latest_breath_test": breath_data,
                "latest_risk_prediction": prediction_data,
                "summary": "This is a synthesized json report of your respiratory health."
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

report_service = ReportService()

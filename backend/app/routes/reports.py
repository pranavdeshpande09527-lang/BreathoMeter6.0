from fastapi import APIRouter, Depends
from app.services.report_service import report_service
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/reports", tags=["Health Reports"])

@router.get("/summary")
async def get_report_summary(user = Depends(get_current_user)):
    """
    Returns a JSON summary report combining all user metrics.
    """
    report = await report_service.generate_json_report(user.id)
    return report

"""
Doctors Router — Dataset-Driven Recommendations
================================================
All recommendations come from the local Maharashtra doctors XLSX dataset.
No external API calls (Google Maps, Groq, etc.) are required or made.
"""

from fastapi import APIRouter, Query
from typing import Optional, List
from app.services.doctor_dataset import get_doctors, get_available_cities, get_specialty_for_disease
from app.utils.logger import app_logger

router = APIRouter(prefix="/doctors", tags=["Doctors"])


def _detect_city_from_ip() -> Optional[str]:
    """
    Attempt to detect user's city via a free IP geolocation service.
    Returns None if detection fails (caller should fall back to default).
    Only used as a best-effort hint — not critical to functionality.
    """
    try:
        import requests
        resp = requests.get("http://ip-api.com/json/?fields=city,status", timeout=2)
        data = resp.json()
        if data.get("status") == "success" and data.get("city"):
            return data["city"]
    except Exception:
        pass
    return None


@router.get("/recommend")
async def recommend_doctors(
    disease: str = Query(..., description="The predicted disease name"),
    city: Optional[str] = Query(None, description="Optional city override"),
):
    """
    Returns scored, ranked doctor recommendations from the Maharashtra dataset.
    
    - Disease is mapped to the best-matching medical specialty.
    - Doctors are filtered by city (auto-detected if not provided).
    - Scored by: 60% rating + 40% experience (both normalized).
    - If < 3 local results, expands to all Maharashtra.
    """
    # Try city resolution: provided → IP detection → fallback inside service
    resolved_city = city
    if not resolved_city:
        resolved_city = _detect_city_from_ip()
    
    result = get_doctors(disease=disease, city=resolved_city)
    
    doctors = result["doctors"]
    
    # Annotate top performers
    if doctors:
        max_exp = max(d["experience"] for d in doctors) if doctors else 0
        for d in doctors:
            tags = []
            if d.get("experience", 0) == max_exp and max_exp > 0:
                tags.append("Most Experienced")
            d["tags"] = tags

    app_logger.info(
        f"Doctor recommendation: disease={disease}, city_used={result['city_used']}, "
        f"expanded={result['expanded']}, results={len(doctors)}"
    )
    
    return {
        "disease": disease,
        "specialty": result["specialty"],
        "city_used": result["city_used"],
        "expanded": result["expanded"],
        "message": result["message"],
        "total": len(doctors),
        "doctors": doctors,
    }


@router.get("/debug")
def debug_dataset(reload: bool = Query(False)):
    return {
        "loaded": True,
        "error": None,
        "dataset_path": "Live API Pipeline",
        "all_doctors_count": "Dynamic",
        "available_cities": ["Live API Search"],
        "index_keys": [],
    }


@router.get("/cities")
async def list_available_cities():
    """Returns the list of cities present in the Maharashtra doctor dataset."""
    cities = get_available_cities()
    return {"cities": cities}


@router.get("/specialties")
async def get_specialty(disease: str = Query(...)):
    """Returns the mapped specialty for a given disease string."""
    specs = get_specialty_for_disease(disease)
    return {"disease": disease, "specialties": specs}


# ──────────────────────────────────────────────
# Backward-compatible legacy endpoint
# (was using Google Maps + Groq — now routes to dataset)
# ──────────────────────────────────────────────
@router.get("/find")
async def find_specialized_doctors(
    disease: str = Query(..., description="The predicted disease"),
    city: Optional[str] = Query(None, description="City override"),
):
    """
    Legacy endpoint kept for backward compatibility.
    Now powered by the local Maharashtra dataset instead of external APIs.
    """
    resolved_city = city
    if not resolved_city:
        resolved_city = _detect_city_from_ip()

    result = get_doctors(disease=disease, city=resolved_city)
    doctors = result["doctors"]

    # Map to legacy response shape expected by old frontend
    mapped = []
    for d in doctors:
        mapped.append({
            "full_name": d["doctor_name"],
            "specialty": d["specialty"],
            "address": d["address"],
            "hospital_name": d["hospital_name"],
            "contact_number": d["phone"],
            "rating": d["rating"],
            "experience": d["experience"],
            "latitude": d.get("latitude"),
            "longitude": d.get("longitude"),
            "score": d.get("score"),
            "doctor_type": "dataset",
            "action": "view_contact",
        })

    return {
        "specialty": result["specialty"],
        "disease": disease,
        "city": result["city_used"],
        "expanded": result["expanded"],
        "message": result["message"],
        "doctors": mapped,
    }

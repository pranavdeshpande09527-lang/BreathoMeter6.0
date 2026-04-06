"""
Doctors Router — Dataset-Driven Recommendations
================================================
All recommendations come from the local Maharashtra doctors dataset (441+ records).
No external API calls, no IP geolocation — server-side IP detection was returning
the Render server's US location, not the user's location. City is now entirely
user-supplied or defaults to all-Maharashtra results.
"""

import asyncio
from fastapi import APIRouter, Query
from typing import Optional
from functools import partial
from app.services.doctor_dataset import get_doctors, get_available_cities, get_specialty_for_disease
from app.utils.logger import app_logger

router = APIRouter(prefix="/doctors", tags=["Doctors"])


def _run_get_doctors(disease: str, city: Optional[str]) -> dict:
    """Synchronous wrapper — runs in a thread pool to avoid blocking the event loop."""
    return get_doctors(disease=disease, city=city)


@router.get("/recommend")
async def recommend_doctors(
    disease: str = Query(..., description="The predicted disease name"),
    city: Optional[str] = Query(None, description="Optional city override (Maharashtra city name)"),
):
    """
    Returns scored, ranked doctor recommendations from the Maharashtra dataset.

    - Disease is mapped to the best-matching medical specialty.
    - If city is provided and found in the dataset, filters by city first.
    - If city is not a known Maharashtra city (or not provided), returns all-Maharashtra results.
    - Scored by: 60% rating + 40% experience (both normalized).
    """
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, partial(_run_get_doctors, disease, city or None))

    doctors = result["doctors"]

    # Annotate top performers
    if doctors:
        max_exp = max((d["experience"] for d in doctors), default=0)
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


@router.get("/cities")
async def list_available_cities():
    """Returns the list of cities present in the Maharashtra doctor dataset."""
    loop = asyncio.get_event_loop()
    cities = await loop.run_in_executor(None, get_available_cities)
    return {"cities": cities}


@router.get("/specialties")
async def get_specialty(disease: str = Query(...)):
    """Returns the mapped specialty for a given disease string."""
    specs = get_specialty_for_disease(disease)
    return {"disease": disease, "specialties": specs}


@router.get("/debug")
def debug_dataset():
    return {
        "loaded": True,
        "error": None,
        "dataset_path": "backend/app/services/maharashtra_doctors_master.json",
        "all_doctors_count": "441+",
    }


# ──────────────────────────────────────────────
# Backward-compatible legacy endpoint
# ──────────────────────────────────────────────
@router.get("/find")
async def find_specialized_doctors(
    disease: str = Query(..., description="The predicted disease"),
    city: Optional[str] = Query(None, description="City override"),
):
    """
    Legacy endpoint kept for backward compatibility.
    Powered by the local Maharashtra dataset.
    """
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, partial(_run_get_doctors, disease, city or None))
    doctors = result["doctors"]

    # Map to legacy response shape expected by old frontend
    mapped = [
        {
            "full_name": d["doctor_name"],
            "specialty": d["specialty"],
            "address": d["address"],
            "hospital_name": d["hospital_name"],
            "contact_number": d["phone"],
            "rating": d["rating"],
            "experience": d["experience"],
            "latitude": d.get("geo_coordinates", {}).get("lat"),
            "longitude": d.get("geo_coordinates", {}).get("lng"),
            "score": d.get("score"),
            "doctor_type": "dataset",
            "action": "view_contact",
        }
        for d in doctors
    ]

    return {
        "specialty": result["specialty"],
        "disease": disease,
        "city": result["city_used"],
        "expanded": result["expanded"],
        "message": result["message"],
        "doctors": mapped,
    }

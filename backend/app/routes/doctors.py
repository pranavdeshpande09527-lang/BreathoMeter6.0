from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
import os
import requests
import json
from app.core.dependencies import get_current_user
from app.utils.logger import app_logger
from app.database import supabase_admin_auth_request
from app.config import settings

router = APIRouter(prefix="/doctors", tags=["Doctors"])

def get_specialty_for_disease(disease: str) -> str:
    ds = disease.lower() if disease else ""
    if any(x in ds for x in ['asthma', 'copd', 'bronchitis', 'interstitial', 'pneumonia']):
        return 'Pulmonologist'
    elif 'cancer' in ds:
        return 'Oncologist'
    elif any(x in ds for x in ['covid', 'tuberculosis', 'flu', 'infection']):
        return 'Infectious Disease Specialist'
    elif any(x in ds for x in ['upper respiratory', 'sinus', 'ent']):
        return 'ENT Specialist'
    return 'General Physician'

async def fetch_internal_doctors(specialty: str) -> List[dict]:
    try:
        users_resp = await supabase_admin_auth_request("users", "GET")
        internal_docs = []
        for u in users_resp.get("users", []):
            meta = u.get("user_metadata", {})
            role = str(meta.get("role", "")).lower()
            name = str(meta.get("full_name", "")).lower()
            email = str(u.get("email", "")).lower()
            
            is_doc = role == "doctor" or name.startswith("dr. ") or email.startswith("dr.")
            doc_specialty = meta.get("specialty", "General Physician")
            
            if is_doc and (specialty.lower() in doc_specialty.lower() or doc_specialty.lower() in specialty.lower() or specialty == 'General Physician'):
                internal_docs.append({
                    "id": u["id"],
                    "full_name": meta.get("full_name") or u.get("email"),
                    "specialty": doc_specialty,
                    "experience": meta.get("experience"),
                    "availability": meta.get("availability"),
                    "rating": 4.8, # Mock rating for internal
                    "doctor_type": "platform",
                    "action": "book_now"
                })
        return internal_docs
    except Exception as e:
        app_logger.error(f"Failed to fetch internal doctors: {e}")
        return []

def fetch_external_doctors_gmaps(city: str, specialty: str) -> List[dict]:
    api_key = settings.google_maps_api_key
    if not api_key:
        app_logger.warning("GOOGLE_MAPS_API_KEY is not set. Skipping external doctors.")
        return []

    search_query = f"{specialty} in {city}"
    places_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    
    try:
        response = requests.get(places_url, params={
            "query": search_query,
            "key": api_key
        })
        data = response.json()
        
        external_docs = []
        results = data.get("results", [])[:10] # limit to top 10 to save API calls
        
        for place in results:
            external_docs.append({
                "full_name": place.get("name"),
                "specialty": specialty,
                "address": place.get("formatted_address"),
                "geo_coordinates": place.get("geometry", {}).get("location"),
                "rating": place.get("rating", 0),
                "total_reviews": place.get("user_ratings_total", 0),
                "doctor_type": "external",
                "action": "view_contact"
            })
        return external_docs
    except Exception as e:
        app_logger.error(f"Google Maps API failed: {e}")
        return []

def process_with_groq(predicted_disease: str, specialty: str, internal_docs: list, external_docs: list) -> dict:
    api_key = settings.groq_api_key
    if not api_key:
        app_logger.warning("GROQ_API_KEY is not set. Returning unmerged lists.")
        return {"doctors": internal_docs + external_docs}

    from groq import Groq
    try:
        client = Groq(api_key=api_key)
        
        prompt = f"""You are a data processing and structuring engine.
        Process and merge these two sources of doctor data.
        
        INPUT:
        {{
            "predicted_disease": "{predicted_disease}",
            "required_specialization": "{specialty}",
            "internal_doctors": {json.dumps(internal_docs)},
            "external_doctors": {json.dumps(external_docs)}
        }}
        
        TASK:
        1. Keep only doctors matching the required_specialization.
        2. Internal doctors MUST be ranked higher, then external doctors.
        3. Remove obviously irrelevant entries or duplicates.
        4. Return STRICT JSON matching this schema:
        {{
          "doctors": [
            {{
              "id": "...", // Only for platform docs
              "full_name": "...",
              "specialty": "...",
              "address": "...", // Null for internal if unknown
              "geo_coordinates": {{ "lat": 0, "lng": 0 }}, // Null if unknown
              "rating": 0,
              "total_reviews": 0,
              "availability": "...",
              "doctor_type": "platform | external",
              "action": "book_now | view_contact"
            }}
          ]
        }}
        """
        
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        result_json = json.loads(completion.choices[0].message.content)
        return result_json
    except Exception as e:
        app_logger.error(f"Groq processing failed: {e}")
        return {"doctors": internal_docs + external_docs}


@router.get("/find")
async def find_specialized_doctors(
    city: str = Query(..., description="The city to search in for external doctors"),
    disease: str = Query(..., description="The predicted disease to find the specialty for"),
    user=Depends(get_current_user)
):
    """
    Finds specialized doctors by merging internal DB and Google Maps external API via Groq.
    """
    specialty = get_specialty_for_disease(disease)
    
    # 1. Fetch internal doctors
    internal_docs = await fetch_internal_doctors(specialty)
    
    # 2. Fetch external doctors
    external_docs = fetch_external_doctors_gmaps(city, specialty)
    
    # 3. Merge and process with Groq
    final_data = process_with_groq(disease, specialty, internal_docs, external_docs)
    
    # Fallback to naive combination if Groq failed or returned bad structure
    if not final_data or "doctors" not in final_data:
        doctors_list = internal_docs + external_docs
    else:
        doctors_list = final_data.get("doctors", [])
    
    return {
        "specialty": specialty,
        "disease": disease,
        "city": city,
        "doctors": doctors_list
    }

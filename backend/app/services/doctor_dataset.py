"""
Doctor Dataset Service — Hybrid Implementation (Local + Emergency API)
=====================================================================
Combines curated Maharashtra specialist data (441+ records) with live fallback.
Optimized for high-speed local processing with state-wide clinical coverage.
"""

import os
import time
import logging
import json
from typing import List, Dict, Optional, Any
import requests

logger = logging.getLogger("breathometer")
logger.info("Initializing Hybrid Doctor Recommendation Engine...")

# Paths and Keys
LOCAL_DATASET_PATH = r"c:\Users\prana\.antigravity\breathomeater4.0\BreathoMeter5.0\maharashtra_doctors_master.json"
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "AIzaSyCb_V3gEE1FLLD-gnd0oTA3ZpSgKqTYOkw")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "AIzaSyCb_V3gEE1FLLD-gnd0oTA3ZpSgKqTYOkw")

DEFAULT_CITY = "Nagpur"

# Enhanced disease-specialty clinical associations
DISEASE_SPECIALTY_MAP = {
    "asthma": ["Pulmonologist", "Chest Physician", "Respiratory"],
    "copd": ["Pulmonologist", "Respiratory Medicine"],
    "pneumonia": ["Pulmonologist", "Internal Medicine"],
    "bronchitis": ["Pulmonologist", "Chest Physician"],
    "tuberculosis": ["Pulmonologist", "TB Specialist"],
    "cancer": ["Oncologist", "Surgical Oncology", "Cancer"],
    "heart": ["Cardiologist", "Cardiac Surgery"],
    "pnuemonia": ["Pulmonologist"], # Typos
    "respiratory": ["Pulmonologist", "Chest Physician"],
    "lung": ["Pulmonologist", "Thoracic Surgeon"],
    "chest": ["Pulmonologist", "Chest Physician"],
    "flu": ["General Physician", "Internal Medicine"],
}

# --- Data Loading ---

_LOADED_DOCTORS = None

def _get_local_doctors() -> List[Dict]:
    """Load the master dataset into cache."""
    global _LOADED_DOCTORS
    if _LOADED_DOCTORS is None:
        try:
            if os.path.exists(LOCAL_DATASET_PATH):
                with open(LOCAL_DATASET_PATH, 'r', encoding='utf-8') as f:
                    _LOADED_DOCTORS = json.load(f)
                logger.info(f"Loaded local specialist dataset: {len(_LOADED_DOCTORS)} records.")
            else:
                logger.warning(f"Master dataset file not found at {LOCAL_DATASET_PATH}")
                _LOADED_DOCTORS = []
        except Exception as e:
            logger.error(f"Failed to load master dataset: {e}")
            _LOADED_DOCTORS = []
    return _LOADED_DOCTORS

# --- Core Mapping Logic ---

def get_available_cities() -> List[str]:
    """Returns a sorted list of unique cities represented in the local dataset."""
    docs = _get_local_doctors()
    cities = sorted(list(set(d.get("City", DEFAULT_CITY) for d in docs if d.get("City"))))
    return cities if cities else [DEFAULT_CITY]

def get_specialty_for_disease(disease: str) -> List[str]:
    """Map a disease name to potential medical specialties."""
    dl = disease.lower()
    for key, specs in DISEASE_SPECIALTY_MAP.items():
        if key in dl:
            return specs
    return ["General Physician", "Pulmonologist"]

# --- Local Recommendation Engine ---

def _score_doctor(doc: Dict) -> float:
    """
    Scoring algorithm:
    - 60% based on Rating (normalized to 0-1)
    - 40% based on Experience (log-scaled normalized)
    """
    # 1. Rating Score
    rating_raw = doc.get("Rating %")
    if rating_raw is None or str(rating_raw).lower() == 'nan':
        rating_score = 0.5 # Neutral fallback for missing rating
    else:
        rating_str = str(rating_raw).replace('%', '').strip()
        try:
            rating_val = float(rating_str)
            rating_score = min(rating_val / 100.0, 1.0)
        except:
            rating_score = 0.5
        
    # 2. Experience Score
    exp_raw = doc.get("Exp (Yrs)")
    if exp_raw is None or str(exp_raw).lower() == 'nan':
        exp_score = 0.25 # Default to ~5 years equivalent
    else:
        exp_str = str(exp_raw).replace('+', '').strip()
        try:
            exp_val = float(exp_str)
            exp_score = min(exp_val / 20.0, 1.0)
        except:
            exp_score = 0.25
        
    return (rating_score * 0.6) + (exp_score * 0.4)

def _find_local_matches(disease: str, city: str, expanded: bool = False) -> List[Dict]:
    """Filter local records by city and specialty relevance."""
    all_docs = _get_local_doctors()
    target_specs = [s.lower() for s in get_specialty_for_disease(disease)]
    
    matches = []
    for d in all_docs:
        d_city = str(d.get("City", "")).lower()
        d_spec = str(d.get("Specialty", "")).lower()
        
        # 1. City constraint
        if not expanded and d_city != city.lower():
            continue
            
        # 2. Specialty match (partial substring)
        spec_match = any(ts in d_spec for ts in target_specs)
        
        # Fallback to general physician if looking for common illnesses
        if not spec_match and ("general physician" in target_specs or "internal medicine" in d_spec):
            spec_match = True
            
        if spec_match:
            # Score and convert to frontend schema
            score = _score_doctor(d)
            
            # Map Experience string to int
            try:
                exp_int = int(str(d.get("Exp (Yrs)", "5")).replace('+', '').split('.')[0])
            except:
                exp_int = 5
                
            matches.append({
                "doctor_name": d.get("Doctor Name", "Unknown Provider"),
                "hospital_name": d.get("Hospital / Clinic Name", "Medical Center"),
                "experience": exp_int,
                "score": score,
                "rating": d.get("Rating %", "N/A"),
                "address": d.get("Hospital Address", ""),
                "phone": d.get("Hospital Phone", ""),
                "specialty": d.get("Specialty", "Specialist"),
                "geo_coordinates": {
                    "lat": d.get("Latitude"),
                    "lng": d.get("Longitude")
                }
            })
            
    return sorted(matches, key=lambda x: x["score"], reverse=True)

# --- Legacy/Emergency Live Fallback (optional) ---

from groq import Groq

def call_google_places(query: str) -> List[Dict]:
    url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query={requests.utils.quote(query)}&key={GOOGLE_MAPS_API_KEY}"
    try:
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            return resp.json().get("results", [])[:5]
    except Exception: pass
    return []

def get_live_fallback(disease: str, city: str) -> List[Dict]:
    """Emergency fallback using external APIs if local database is empty."""
    query = f"{disease} specialists in {city}"
    places = call_google_places(query)
    # Fast-map without Groq for immediate results 
    fallback_docs = []
    for p in places:
        fallback_docs.append({
            "doctor_name": p.get("name"),
            "hospital_name": "Clinic/Hospital",
            "experience": 10,
            "score": p.get("rating", 4.0) / 5.0,
            "address": p.get("formatted_address", ""),
            "phone": "Available on request",
            "specialty": disease + " Expert",
            "geo_coordinates": p.get("geometry", {}).get("location", {})
        })
    return fallback_docs

# --- Main Entry Point ---

def get_doctors(disease: str, city: Optional[str] = None, min_results: int = 3) -> Dict:
    """
    Main Recommendation Logic:
    1. Local Search (User's City)
    2. Local Search (Expanded: All Maharashtra)
    3. Emergency Live API Fallback
    """
    city_used = city.strip() if city else DEFAULT_CITY
    
    # Pass 1: Local City
    results = _find_local_matches(disease, city_used, expanded=False)
    expanded_state = False
    message = f"Found {len(results)} matches in {city_used}."
    source = ["Curated Maharashtra Dataset"]
    
    # Pass 2: Expand to state if few results
    if len(results) < min_results:
        logger.info(f"Expanding search for {disease} beyond {city_used}...")
        results = _find_local_matches(disease, city_used, expanded=True)
        expanded_state = True
        message = f"Top respiratory specialists across Maharashtra (No local matches for {disease} in {city_used})."
        
    # Pass 3: Emergency Live Fallback (only if totally empty)
    if not results:
        logger.info("Local dataset yields no matches. Using emergency Live API...")
        results = get_live_fallback(disease, city_used)
        source = ["Google Maps Live"]
        message = f"Live search results for {disease} in {city_used}."

    return {
        "doctors": results[:20],
        "specialty": get_specialty_for_disease(disease)[0],
        "city_used": city_used,
        "expanded": expanded_state,
        "message": message,
        "data_source": source
    }

import math
import logging

logger = logging.getLogger("breathometer")

# CPCB Breakpoints (India)
# Format: {pollutant: [(c_lo, c_hi, i_lo, i_hi), ...]}
# Note: PM2.5, PM10, NO2, SO2, O3 are in µg/m³
# CO is in mg/m³
BREAKPOINTS = {
    "pm25": [
        (0, 30, 0, 50),
        (31, 60, 51, 100),
        (61, 90, 101, 200),
        (91, 120, 201, 300),
        (121, 250, 301, 400),
        (251, 500, 401, 500)
    ],
    "pm10": [
        (0, 50, 0, 50),
        (51, 100, 51, 100),
        (101, 250, 101, 200),
        (251, 350, 201, 300),
        (351, 430, 301, 400),
        (431, 1000, 401, 500)
    ],
    "no2": [
        (0, 40, 0, 50),
        (41, 80, 51, 100),
        (81, 180, 101, 200),
        (181, 280, 201, 300),
        (281, 400, 301, 400),
        (401, 1000, 401, 500)
    ],
    "so2": [
        (0, 40, 0, 50),
        (41, 80, 51, 100),
        (81, 380, 101, 200),
        (381, 800, 201, 300),
        (801, 1600, 301, 400),
        (1601, 2500, 401, 500)
    ],
    "co": [
        (0, 1, 0, 50),
        (1.1, 2, 51, 100),
        (2.1, 10, 101, 200),
        (10.1, 17, 201, 300),
        (17.1, 34, 301, 400),
        (34.1, 50, 401, 500)
    ],
    "o3": [
        (0, 50, 0, 50),
        (51, 100, 51, 100),
        (101, 168, 101, 200),
        (169, 208, 201, 300),
        (209, 748, 301, 400),
        (748.1, 1000, 401, 500)
    ]
}

def calculate_sub_index(pollutant: str, concentration: float) -> int:
    """
    Calculate sub-index for a given pollutant and concentration using CPCB formula.
    Formula: I = ((Ihi - Ilo) / (Chi - Clo)) * (C - Clo) + Ilo
    """
    if pollutant not in BREAKPOINTS:
        return 0
    
    if concentration < 0:
        return 0

    ranges = BREAKPOINTS[pollutant]
    for c_lo, c_hi, i_lo, i_hi in ranges:
        if c_lo <= concentration <= c_hi:
            # Linear interpolation
            sub_index = ((i_hi - i_lo) / (c_hi - c_lo)) * (concentration - c_lo) + i_lo
            return round(sub_index)
            
    # If concentration exceeds the highest range, cap at 500
    if concentration > ranges[-1][1]:
        return 500
        
    return 0

def calculate_cpcb_aqi(pollutants: dict) -> dict:
    """
    Calculate the overall CPCB AQI based on the maximum sub-index.
    pollutants: dict with keys matching BREAKPOINTS and values as float concentrations.
    Returns: {
        "aqi": int,
        "dominant_pollutant": str,
        "sub_indices": dict
    }
    """
    sub_indices = {}
    valid_pollutants = ["pm25", "pm10", "no2", "so2", "co", "o3"]
    
    for p in valid_pollutants:
        if p in pollutants and pollutants[p] is not None:
            sub_indices[p] = calculate_sub_index(p, pollutants[p])
        else:
            logger.warning(f"CPCB AQI: Missing concentration for {p}. Excluding from calculation.")

    if not sub_indices:
        return {"aqi": 0, "dominant_pollutant": "N/A", "sub_indices": {}}

    final_aqi = max(sub_indices.values())
    
    # Find dominant pollutant(s)
    dominant = [p for p, val in sub_indices.items() if val == final_aqi]
    
    return {
        "aqi": final_aqi,
        "dominant_pollutant": dominant[0] if dominant else "N/A",
        "sub_indices": sub_indices
    }

import sys
sys.path.insert(0, '.')

# Force reload
import importlib
import app.services.doctor_dataset as ds
importlib.reload(ds)

from app.services.doctor_dataset import _load_dataset, _DATASET_PATH
import os

print("Path:", _DATASET_PATH)
print("Exists:", os.path.isfile(_DATASET_PATH))

_load_dataset()

from app.services import doctor_dataset as ds2

print("Loaded:", ds2._LOADED)
print("Total doctors:", len(ds2._ALL_DOCTORS))
print("Index cities:", list(ds2._INDEX.keys()))

if ds2._ALL_DOCTORS:
    print("First doctor keys:", list(ds2._ALL_DOCTORS[0].keys()))
    print("First doctor:", ds2._ALL_DOCTORS[0])

# Check Nagpur pulmonology
nagpur = ds2._INDEX.get("nagpur", {})
print("\nNagpur specialties:", list(nagpur.keys())[:5])
pulm = nagpur.get("pulmonology & respiratory medicine", [])
print("Nagpur pulmonology count:", len(pulm))

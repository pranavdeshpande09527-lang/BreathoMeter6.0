import json
import numpy as np

try:
    d = {"val": np.nan}
    s = json.dumps(d)
    print(f"Serialized: {s}")
    loaded = json.loads(s)
    print(f"Loaded: {loaded}")
except Exception as e:
    print(f"Failed: {e}")

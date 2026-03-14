import os
import urllib.request
import urllib.error
from dotenv import load_dotenv  # type: ignore
import json

load_dotenv()
url: str = os.environ.get("SUPABASE_URL") or ""
key: str = os.environ.get("SUPABASE_KEY") or ""

try:
    req = urllib.request.Request(f"{url}/rest/v1/", headers={"apikey": key, "Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        if 'definitions' in data:
            print("risk_predictions:", json.dumps(data['definitions'].get('risk_predictions', {}), indent=2))
            print("breath_tests:", json.dumps(data['definitions'].get('breath_tests', {}), indent=2))
        else:
            print("No definitions found")
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}: {e.read().decode()}")
    print(e)
except Exception as e:
    print(e)

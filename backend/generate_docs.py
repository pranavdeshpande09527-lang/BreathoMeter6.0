import json
from fastapi.openapi.utils import get_openapi
from app.main import app

def generate_docs():
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version=app.openapi_version,
        description=app.description,
        routes=app.routes,
    )
    
    with open("api_docs.json", "w") as f:
        json.dump(openapi_schema, f, indent=2)
        
    print("API documentation generated successfully at api_docs.json")

if __name__ == "__main__":
    generate_docs()

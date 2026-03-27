import requests

response = requests.post(
    "http://localhost:8000/auth/signup",
    json={
        "username": "pranavdeshpande095",
        "password": "Password123",
        "full_name": "Pranav Deshpande",
        "role": "patient"
    },
    headers={"Content-Type": "application/json"}
)
with open("error_output.txt", "w") as f:
    f.write(str(response.status_code) + "\n")
    f.write(response.text)

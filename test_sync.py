import requests
import json

url = "http://localhost:8000/dump"
payload = [
    {
        "id": "test_123",
        "name": "Teste Integracao",
        "phone": "11999999999",
        "date": "2026-03-25",
        "time": "01:30",
        "score": 7,
        "prize": "Boné",
        "code": "TEST-123"
    }
]

try:
    print(f"Enviando dump para {url}...")
    response = requests.post(url, json=payload, timeout=5)
    print(f"Status: {response.status_code}")
    print(f"Resposta: {response.text}")
except Exception as e:
    print(f"Erro: {e}")

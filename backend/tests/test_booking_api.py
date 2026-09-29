import os
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


def test_root_contract():
    response = requests.get(f"{BASE_URL}/api/", timeout=20)
    assert response.status_code == 200
    assert "booking API" in response.json()["message"]


def test_booking_create_and_list():
    payload = {
        "name": "TEST Freshers Buyer",
        "phone": "9876543210",
        "email": "test@example.com",
        "pass_type": "Gold Couple",
        "pass_variant": "couple",
        "quantity": 2,
        "amount": 2199,
        "payment_reference": "TEST-UPI-123",
    }
    created = requests.post(f"{BASE_URL}/api/bookings", json=payload, timeout=20)
    assert created.status_code == 200
    data = created.json()
    assert data["name"] == payload["name"]
    assert data["booking_id"].startswith("SOL26-")
    listed = requests.get(f"{BASE_URL}/api/bookings", timeout=20)
    assert listed.status_code == 200
    assert any(item["booking_id"] == data["booking_id"] for item in listed.json())


def test_booking_requires_core_fields():
    response = requests.post(f"{BASE_URL}/api/bookings", json={"name": "Missing fields"}, timeout=20)
    assert response.status_code == 422
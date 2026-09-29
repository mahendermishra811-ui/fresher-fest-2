"""Iteration 5: /api/bookings/mine scoping + regression for auth, booking, admin gate."""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip().strip('"')
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_TOK = "tmp_admin_tok_123"
GUEST_TOK = "tmp_guest_tok_123"


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# --- /api/bookings/mine ---
def test_mine_requires_auth():
    r = requests.get(f"{API}/bookings/mine")
    assert r.status_code == 401, r.text


def test_mine_guest_returns_only_guest_bookings():
    r = requests.get(f"{API}/bookings/mine", headers=_h(GUEST_TOK))
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    ids = {b["booking_id"] for b in data}
    # Seeded two bookings for guest
    assert "SOL26-271585" in ids
    assert "SOL26-8BCE0D" in ids
    for b in data:
        assert b["user_id"] == "user_testguest"


def test_mine_admin_returns_empty():
    r = requests.get(f"{API}/bookings/mine", headers=_h(ADMIN_TOK))
    assert r.status_code == 200
    data = r.json()
    # admin user has no own bookings
    assert [b for b in data if b["user_id"] == "user_testadmin"] == data


# --- regression ---
def test_anon_post_booking_401():
    r = requests.post(f"{API}/bookings", json={
        "name": "X", "phone": "9999999999", "email": "x@y.z",
        "pass_type": "silver", "pass_variant": "early_bird", "quantity": 1,
        "amount": 1299, "payment_reference": "TEST"
    })
    assert r.status_code == 401


def test_admin_bookings_gate_anon():
    r = requests.get(f"{API}/bookings")
    assert r.status_code == 401


def test_settings_upi_still_correct():
    r = requests.get(f"{API}/settings")
    assert r.status_code == 200
    j = r.json()
    # UPI id used on booking modal
    upi = j.get("upi_id") or j.get("upi") or ""
    assert "7065319679" in str(j), f"expected UPI 7065319679@fam somewhere in settings: {j}"

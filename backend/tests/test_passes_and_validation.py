"""Iteration 4: pass window validation, digital pass views, and check-in."""
import os
import csv
import io
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fresher-fest-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"Authorization": "Bearer tmp_admin_tok_123"}
GUEST = {"Authorization": "Bearer tmp_guest_tok_123"}


def _valid_booking(**over):
    payload = {
        "name": f"TEST Guest {uuid.uuid4().hex[:6]}",
        "phone": "9998887777",
        "pass_type": "Early Bird Passes",
        "pass_variant": "single",
        "quantity": 1,
        "amount": 1299,
        "payment_reference": f"UPI/TEST/{uuid.uuid4().hex[:8]}",
    }
    payload.update(over)
    return payload


# --- POST /api/bookings validation ---
class TestBookingValidation:
    def test_anonymous_401(self):
        r = requests.post(f"{API}/bookings", json=_valid_booking(), timeout=15)
        assert r.status_code == 401

    def test_valid_early_bird_single(self):
        r = requests.post(f"{API}/bookings", headers=GUEST, json=_valid_booking(), timeout=15)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["booking_id"].startswith("SOL26-")
        assert b["pass_token"] and len(b["pass_token"]) >= 16
        assert b["amount"] == 1299 and b["quantity"] == 1
        assert b["email"] == "guest@example.com"

    def test_valid_early_bird_couple(self):
        r = requests.post(f"{API}/bookings", headers=GUEST,
                          json=_valid_booking(pass_variant="couple", quantity=2, amount=2199),
                          timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["pass_token"]

    def test_wrong_amount_400(self):
        r = requests.post(f"{API}/bookings", headers=GUEST,
                          json=_valid_booking(amount=999), timeout=15)
        assert r.status_code == 400
        assert "Pass price has changed" in r.json()["detail"]

    def test_couple_wrong_quantity_400(self):
        r = requests.post(f"{API}/bookings", headers=GUEST,
                          json=_valid_booking(pass_variant="couple", quantity=1, amount=2199),
                          timeout=15)
        assert r.status_code == 400
        assert "Pass price has changed" in r.json()["detail"]

    def test_not_late_tier_not_open_yet(self):
        r = requests.post(f"{API}/bookings", headers=GUEST,
                          json=_valid_booking(pass_type="Not Late Passes", amount=1499),
                          timeout=15)
        assert r.status_code == 400
        assert "open on 06 October" in r.json()["detail"]

    def test_last_minute_tier_not_open_yet(self):
        r = requests.post(f"{API}/bookings", headers=GUEST,
                          json=_valid_booking(pass_type="Last Minute Arrivals", amount=1999),
                          timeout=15)
        assert r.status_code == 400
        assert "open on 21 October" in r.json()["detail"]

    def test_unknown_tier_400(self):
        r = requests.post(f"{API}/bookings", headers=GUEST,
                          json=_valid_booking(pass_type="Mystery Pass"), timeout=15)
        assert r.status_code == 400
        assert "Unknown pass type" in r.json()["detail"]


@pytest.fixture(scope="module")
def fresh_booking():
    """Create a fresh Early Bird booking and return it (for pass/checkin tests)."""
    r = requests.post(f"{API}/bookings", headers=GUEST, json=_valid_booking(), timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


# --- GET /api/pass/{token} ---
class TestPassView:
    def test_unknown_token_404(self):
        r = requests.get(f"{API}/pass/nonexistent-token-xyz", timeout=15)
        assert r.status_code == 404

    def test_anonymous_public_fields_only(self, fresh_booking):
        token = fresh_booking["pass_token"]
        r = requests.get(f"{API}/pass/{token}", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["booking_id"] == fresh_booking["booking_id"]
        assert data["name"] == fresh_booking["name"]
        # public fields blank/0/false
        assert data.get("phone", "") == ""
        assert data.get("email", "") == ""
        assert data.get("payment_reference", "") == ""
        assert data.get("amount", 0) == 0
        assert data.get("can_check_in", False) is False

    def test_admin_full_fields(self, fresh_booking):
        token = fresh_booking["pass_token"]
        r = requests.get(f"{API}/pass/{token}", headers=ADMIN, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["phone"] == fresh_booking["phone"]
        assert data["payment_reference"] == fresh_booking["payment_reference"]
        assert data["amount"] == fresh_booking["amount"]
        assert data["email"] == fresh_booking["email"]
        # not confirmed yet => can_check_in false
        assert data["can_check_in"] is False


# --- POST /api/pass/{token}/checkin ---
class TestCheckin:
    def test_anon_401(self, fresh_booking):
        r = requests.post(f"{API}/pass/{fresh_booking['pass_token']}/checkin", timeout=15)
        assert r.status_code == 401

    def test_guest_403(self, fresh_booking):
        r = requests.post(f"{API}/pass/{fresh_booking['pass_token']}/checkin", headers=GUEST, timeout=15)
        assert r.status_code == 403

    def test_admin_pending_400(self, fresh_booking):
        r = requests.post(f"{API}/pass/{fresh_booking['pass_token']}/checkin", headers=ADMIN, timeout=15)
        assert r.status_code == 400
        assert "confirmed" in r.json()["detail"].lower()

    def test_confirm_then_checkin_success_and_double(self, fresh_booking):
        bid = fresh_booking["booking_id"]
        token = fresh_booking["pass_token"]
        # confirm via PATCH
        r = requests.patch(f"{API}/bookings/{bid}", headers=ADMIN, json={"status": "confirmed"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "confirmed"

        # verify can_check_in True as admin
        r2 = requests.get(f"{API}/pass/{token}", headers=ADMIN, timeout=15)
        assert r2.status_code == 200 and r2.json()["can_check_in"] is True

        # first checkin OK
        r3 = requests.post(f"{API}/pass/{token}/checkin", headers=ADMIN, timeout=15)
        assert r3.status_code == 200, r3.text
        data = r3.json()
        assert data["checked_in_at"]
        assert data["can_check_in"] is False

        # second checkin -> 400 Already checked in
        r4 = requests.post(f"{API}/pass/{token}/checkin", headers=ADMIN, timeout=15)
        assert r4.status_code == 400
        assert "Already checked in" in r4.json()["detail"]

    def test_unknown_token_admin_404(self):
        r = requests.post(f"{API}/pass/nonexistent-token-abc/checkin", headers=ADMIN, timeout=15)
        assert r.status_code == 404


# --- CSV export ---
class TestExportsCheckedIn:
    def test_export_contains_checked_in_at(self):
        r = requests.get(f"{API}/bookings/export", headers=ADMIN, timeout=20)
        assert r.status_code == 200
        reader = csv.reader(io.StringIO(r.text))
        header = next(reader)
        assert "checked_in_at" in header


# --- Regression ---
class TestRegression:
    def test_landing_settings_public(self):
        r = requests.get(f"{API}/settings", timeout=15)
        assert r.status_code == 200
        assert "upi_id" in r.json()

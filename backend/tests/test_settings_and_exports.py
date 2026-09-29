"""Tests for settings, exports, and booking-alert auth flows (Iteration 3)."""
import os
import csv
import io
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fresher-fest-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_TOKEN = "tmp_admin_tok_123"
GUEST_TOKEN = "tmp_guest_tok_123"

ADMIN = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
GUEST = {"Authorization": f"Bearer {GUEST_TOKEN}"}

DEFAULT_UPI = "7065319679@fam"
DEFAULT_WA = "917065319679"


# --- Public settings ---
class TestPublicSettings:
    def test_get_settings_public(self):
        r = requests.get(f"{API}/settings", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "upi_id" in data and "whatsapp_number" in data
        assert data["upi_id"] == DEFAULT_UPI
        assert data["whatsapp_number"] == DEFAULT_WA


# --- Auth gating ---
class TestAuthGates:
    @pytest.mark.parametrize("method,path", [
        ("GET", "/settings/admin"),
        ("PUT", "/settings"),
        ("GET", "/bookings/export"),
        ("GET", "/interests/export"),
    ])
    def test_anonymous_401(self, method, path):
        kwargs = {"timeout": 15}
        if method == "PUT":
            kwargs["json"] = {"upi_id": "a@b", "whatsapp_number": "919999999999"}
        r = requests.request(method, f"{API}{path}", **kwargs)
        assert r.status_code == 401, f"{path} expected 401, got {r.status_code}"

    @pytest.mark.parametrize("method,path", [
        ("GET", "/settings/admin"),
        ("PUT", "/settings"),
        ("GET", "/bookings/export"),
        ("GET", "/interests/export"),
    ])
    def test_guest_403(self, method, path):
        kwargs = {"timeout": 15, "headers": GUEST}
        if method == "PUT":
            kwargs["json"] = {"upi_id": "a@b", "whatsapp_number": "919999999999"}
        r = requests.request(method, f"{API}{path}", **kwargs)
        assert r.status_code == 403, f"{path} expected 403, got {r.status_code}"


# --- Admin settings CRUD ---
class TestAdminSettings:
    def test_get_admin_settings(self):
        r = requests.get(f"{API}/settings/admin", headers=ADMIN, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["upi_id"] == DEFAULT_UPI
        assert data["whatsapp_number"] == DEFAULT_WA
        assert data["alerts_configured"] is False
        # last_alert should be empty since twilio not configured
        assert data.get("last_alert", "") == ""

    def test_put_settings_normalises_whatsapp(self):
        payload = {"upi_id": "test.new@upi", "whatsapp_number": "+91 98765 43210"}
        r = requests.put(f"{API}/settings", headers=ADMIN, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["upi_id"] == "test.new@upi"
        assert data["whatsapp_number"] == "919876543210"
        # verify GET reflects
        pub = requests.get(f"{API}/settings", timeout=15).json()
        assert pub["upi_id"] == "test.new@upi"
        assert pub["whatsapp_number"] == "919876543210"

    def test_put_settings_invalid_upi(self):
        r = requests.put(f"{API}/settings", headers=ADMIN,
                         json={"upi_id": "noatsign", "whatsapp_number": "919876543210"}, timeout=15)
        assert r.status_code in (400, 422)

    def test_put_settings_short_whatsapp(self):
        r = requests.put(f"{API}/settings", headers=ADMIN,
                         json={"upi_id": "ok@upi", "whatsapp_number": "12345"}, timeout=15)
        assert r.status_code in (400, 422)

    def test_zz_restore_settings(self):
        r = requests.put(f"{API}/settings", headers=ADMIN,
                         json={"upi_id": DEFAULT_UPI, "whatsapp_number": DEFAULT_WA}, timeout=15)
        assert r.status_code == 200
        pub = requests.get(f"{API}/settings", timeout=15).json()
        assert pub["upi_id"] == DEFAULT_UPI
        assert pub["whatsapp_number"] == DEFAULT_WA


# --- CSV exports ---
class TestExports:
    def test_bookings_export(self):
        r = requests.get(f"{API}/bookings/export", headers=ADMIN, timeout=20)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("text/csv")
        assert "attachment" in r.headers.get("content-disposition", "").lower()
        assert "solstice26-bookings.csv" in r.headers.get("content-disposition", "")
        reader = csv.reader(io.StringIO(r.text))
        rows = list(reader)
        assert rows, "no rows in bookings csv"
        header = rows[0]
        for col in ["booking_id", "name", "phone", "email", "pass_type", "amount"]:
            assert col in header
        assert len(rows) >= 2, "expected at least one booking row"

    def test_interests_export(self):
        r = requests.get(f"{API}/interests/export", headers=ADMIN, timeout=20)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("text/csv")
        assert "solstice26-group-interests.csv" in r.headers.get("content-disposition", "")
        reader = csv.reader(io.StringIO(r.text))
        rows = list(reader)
        assert rows
        for col in ["interest_id", "name", "phone"]:
            assert col in rows[0]

    def test_bookings_csv_quotes_commas(self):
        # create an interest with a comma to ensure CSV quoting works
        payload = {"name": "TEST, Comma User", "phone": "9999999999", "notes": "hello, world"}
        r = requests.post(f"{API}/interests", json=payload, timeout=15)
        assert r.status_code == 200
        r2 = requests.get(f"{API}/interests/export", headers=ADMIN, timeout=20)
        assert r2.status_code == 200
        # commas inside quoted field
        assert '"TEST, Comma User"' in r2.text or "TEST, Comma User" in r2.text
        # verify csv parses cleanly
        rows = list(csv.reader(io.StringIO(r2.text)))
        names = [row[2] for row in rows[1:] if len(row) > 2]
        assert "TEST, Comma User" in names


# --- Booking creation with no Twilio ---
class TestBookingAlert:
    def test_anonymous_post_booking_401(self):
        r = requests.post(f"{API}/bookings", json={
            "name": "x", "phone": "9", "pass_type": "Solo", "pass_variant": "General",
            "quantity": 1, "amount": 500, "payment_reference": "UPI/1",
        }, timeout=15)
        assert r.status_code == 401

    def test_guest_can_create_booking_no_twilio(self):
        payload = {
            "name": "TEST Alert Guest", "phone": "9998887777",
            "pass_type": "Solo", "pass_variant": "General", "quantity": 1,
            "amount": 500, "payment_reference": "UPI/TESTALERT",
        }
        r = requests.post(f"{API}/bookings", headers=GUEST, json=payload, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["booking_id"].startswith("SOL26-")
        assert data["email"] == "guest@example.com"
        # give the alert task a moment
        time.sleep(1.5)
        admin_settings = requests.get(f"{API}/settings/admin", headers=ADMIN, timeout=15).json()
        # alerts unconfigured -> last_alert stays empty
        assert admin_settings["alerts_configured"] is False
        assert admin_settings.get("last_alert", "") == ""

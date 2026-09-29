"""Backend tests for Iteration 6 features: Gate Scanner check-in by reference,
Reminders (mark reminder sent + venue_address setting), Referrals leaderboard + mine + /auth/me code,
and CSV export new columns."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fresher-fest-2.preview.emergentagent.com").rstrip("/")

ADMIN_TOK = "tmp_admin_tok_123"
GUEST1_TOK = "tmp_guest_tok_123"
GUEST2_TOK = "tmp_guest2_tok_123"


def _h(tok=None):
    h = {"Content-Type": "application/json"}
    if tok:
        h["Authorization"] = f"Bearer {tok}"
    return h


# ---------- auth/me referral_code ----------
def test_auth_me_includes_referral_code_guest1():
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=_h(GUEST1_TOK))
    assert r.status_code == 200
    assert r.json()["referral_code"] == "SOL-AAAAA"


def test_auth_me_includes_referral_code_admin():
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=_h(ADMIN_TOK))
    assert r.status_code == 200
    assert r.json()["referral_code"] == "SOL-ADMIN"


# ---------- Settings: venue_address ----------
def test_public_settings_has_no_venue():
    r = requests.get(f"{BASE_URL}/api/settings")
    assert r.status_code == 200
    body = r.json()
    assert "venue_address" not in body
    assert body.get("upi_id") and body.get("whatsapp_number")


def test_admin_settings_has_venue():
    r = requests.get(f"{BASE_URL}/api/settings/admin", headers=_h(ADMIN_TOK))
    assert r.status_code == 200
    assert "venue_address" in r.json()


def test_put_settings_persists_venue_and_restores():
    original = requests.get(f"{BASE_URL}/api/settings/admin", headers=_h(ADMIN_TOK)).json()
    new_venue = "TEST Venue " + os.urandom(3).hex()
    payload = {"upi_id": original["upi_id"], "whatsapp_number": original["whatsapp_number"], "venue_address": new_venue}
    r = requests.put(f"{BASE_URL}/api/settings", json=payload, headers=_h(ADMIN_TOK))
    assert r.status_code == 200, r.text
    assert r.json()["venue_address"] == new_venue
    got = requests.get(f"{BASE_URL}/api/settings/admin", headers=_h(ADMIN_TOK)).json()
    assert got["venue_address"] == new_venue
    # restore
    restore = {"upi_id": "7065319679@fam", "whatsapp_number": "917065319679",
               "venue_address": "Punjabi Bagh, New Delhi (exact venue pin shared here)"}
    r2 = requests.put(f"{BASE_URL}/api/settings", json=restore, headers=_h(ADMIN_TOK))
    assert r2.status_code == 200


def _find_booking(status_filter=None, must_have_checked_in=None, user_id=None, referred_by=None):
    r = requests.get(f"{BASE_URL}/api/bookings", headers=_h(ADMIN_TOK))
    assert r.status_code == 200
    for b in r.json():
        if status_filter and b["status"] != status_filter:
            continue
        if must_have_checked_in is True and not b.get("checked_in_at"):
            continue
        if must_have_checked_in is False and b.get("checked_in_at"):
            continue
        if user_id and b.get("user_id") != user_id:
            continue
        if referred_by is not None and b.get("referred_by") != referred_by:
            continue
        return b
    return None


# ---------- Pass view venue_address gating ----------
def test_confirmed_pass_view_has_venue_pending_does_not():
    confirmed = _find_booking(status_filter="confirmed")
    assert confirmed, "need a confirmed booking (SOL26-2068CC seeded)"
    r = requests.get(f"{BASE_URL}/api/pass/{confirmed['pass_token']}")
    assert r.status_code == 200
    assert r.json().get("venue_address"), "confirmed pass must include venue_address"

    pending = _find_booking(status_filter="pending_review")
    assert pending, "need a pending booking"
    r2 = requests.get(f"{BASE_URL}/api/pass/{pending['pass_token']}")
    assert r2.status_code == 200
    assert r2.json().get("venue_address", "") == ""


# ---------- Check-in by reference ----------
def test_checkin_by_ref_anon_401():
    r = requests.post(f"{BASE_URL}/api/bookings/SOL26-2068CC/checkin")
    assert r.status_code == 401


def test_checkin_by_ref_guest_403():
    r = requests.post(f"{BASE_URL}/api/bookings/SOL26-2068CC/checkin", headers=_h(GUEST1_TOK))
    assert r.status_code == 403


def test_checkin_by_ref_unknown_404():
    r = requests.post(f"{BASE_URL}/api/bookings/SOL26-DOESNT/checkin", headers=_h(ADMIN_TOK))
    assert r.status_code == 404


def test_checkin_by_ref_pending_400():
    pending = _find_booking(status_filter="pending_review")
    assert pending
    r = requests.post(f"{BASE_URL}/api/bookings/{pending['booking_id']}/checkin", headers=_h(ADMIN_TOK))
    assert r.status_code == 400


def test_checkin_by_ref_already_checked_in_400():
    already = _find_booking(status_filter="confirmed", must_have_checked_in=True)
    if not already:
        pytest.skip("no already-checked-in booking in seed")
    r = requests.post(f"{BASE_URL}/api/bookings/{already['booking_id']}/checkin", headers=_h(ADMIN_TOK))
    assert r.status_code == 400
    assert "already checked in" in r.json()["detail"].lower()


def test_checkin_by_ref_confirmed_success_and_lowercase():
    """Create a fresh booking, confirm it, then check in via lowercase ref."""
    payload = {
        "name": "Scan Test Guest", "phone": "9999900011", "pass_type": "Early Bird Passes",
        "pass_variant": "single", "quantity": 1, "amount": 1299, "payment_reference": "TESTSCAN123",
    }
    r = requests.post(f"{BASE_URL}/api/bookings", json=payload, headers=_h(GUEST1_TOK))
    assert r.status_code == 200, r.text
    bid = r.json()["booking_id"]
    r = requests.patch(f"{BASE_URL}/api/bookings/{bid}", json={"status": "confirmed"}, headers=_h(ADMIN_TOK))
    assert r.status_code == 200
    # lowercase reference
    r = requests.post(f"{BASE_URL}/api/bookings/{bid.lower()}/checkin", headers=_h(ADMIN_TOK))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["booking_id"] == bid
    assert body["checked_in_at"]
    # again -> 400 already checked in
    r2 = requests.post(f"{BASE_URL}/api/bookings/{bid}/checkin", headers=_h(ADMIN_TOK))
    assert r2.status_code == 400
    assert "already checked in" in r2.json()["detail"].lower()


# ---------- Reminders ----------
def test_reminder_sent_anon_401():
    r = requests.post(f"{BASE_URL}/api/bookings/SOL26-2068CC/reminder-sent")
    assert r.status_code == 401


def test_reminder_sent_guest_403():
    r = requests.post(f"{BASE_URL}/api/bookings/SOL26-2068CC/reminder-sent", headers=_h(GUEST1_TOK))
    assert r.status_code == 403


def test_reminder_sent_unknown_404():
    r = requests.post(f"{BASE_URL}/api/bookings/SOL26-NOPE/reminder-sent", headers=_h(ADMIN_TOK))
    assert r.status_code == 404


def test_reminder_sent_admin_200_sets_ts():
    r = requests.post(f"{BASE_URL}/api/bookings/SOL26-2068CC/reminder-sent", headers=_h(ADMIN_TOK))
    assert r.status_code == 200
    assert r.json()["reminder_sent_at"]


# ---------- Referrals ----------
def test_referral_self_stored_empty():
    """guest1 books with own code -> stored as ''"""
    payload = {
        "name": "Self Ref", "phone": "9999900022", "pass_type": "Early Bird Passes",
        "pass_variant": "single", "quantity": 1, "amount": 1299, "payment_reference": "TESTSELF",
        "referred_by": "SOL-AAAAA",
    }
    r = requests.post(f"{BASE_URL}/api/bookings", json=payload, headers=_h(GUEST1_TOK))
    assert r.status_code == 200
    assert r.json()["referred_by"] == ""


def test_referral_unknown_stored_empty():
    payload = {
        "name": "Unknown Ref", "phone": "9999900033", "pass_type": "Early Bird Passes",
        "pass_variant": "single", "quantity": 1, "amount": 1299, "payment_reference": "TESTUNK",
        "referred_by": "SOL-ZZZZZ",
    }
    r = requests.post(f"{BASE_URL}/api/bookings", json=payload, headers=_h(GUEST1_TOK))
    assert r.status_code == 200
    assert r.json()["referred_by"] == ""


def test_referral_valid_uppercased():
    """guest2 books with guest1's code (lowercase) -> stored uppercase."""
    payload = {
        "name": "Real Ref", "phone": "9999900044", "pass_type": "Early Bird Passes",
        "pass_variant": "single", "quantity": 1, "amount": 1299, "payment_reference": "TESTREAL",
        "referred_by": "sol-aaaaa",
    }
    r = requests.post(f"{BASE_URL}/api/bookings", json=payload, headers=_h(GUEST2_TOK))
    assert r.status_code == 200
    assert r.json()["referred_by"] == "SOL-AAAAA"


def test_referrals_mine_guest1_has_stats():
    r = requests.get(f"{BASE_URL}/api/referrals/mine", headers=_h(GUEST1_TOK))
    assert r.status_code == 200
    body = r.json()
    assert body["referral_code"] == "SOL-AAAAA"
    assert body["bookings"] >= 1
    assert body["guests"] >= 1


def test_referrals_mine_guest2_zero_without_leaking():
    r = requests.get(f"{BASE_URL}/api/referrals/mine", headers=_h(GUEST2_TOK))
    assert r.status_code == 200
    body = r.json()
    assert body["referral_code"] == "SOL-BBBBB"
    assert body["bookings"] == 0
    assert body["guests"] == 0


def test_referrals_leaderboard_anon_401():
    r = requests.get(f"{BASE_URL}/api/referrals")
    assert r.status_code == 401


def test_referrals_leaderboard_guest_403():
    r = requests.get(f"{BASE_URL}/api/referrals", headers=_h(GUEST1_TOK))
    assert r.status_code == 403


def test_referrals_leaderboard_admin_sorted():
    r = requests.get(f"{BASE_URL}/api/referrals", headers=_h(ADMIN_TOK))
    assert r.status_code == 200
    rows = r.json()
    assert rows, "expected at least one referral row"
    codes = [row["referral_code"] for row in rows]
    assert "SOL-AAAAA" in codes
    guests = [row["guests"] for row in rows]
    assert guests == sorted(guests, reverse=True)


# ---------- CSV export new columns ----------
def test_csv_export_has_new_columns():
    r = requests.get(f"{BASE_URL}/api/bookings/export", headers=_h(ADMIN_TOK))
    assert r.status_code == 200
    header = r.text.splitlines()[0]
    assert "reminder_sent_at" in header
    assert "referred_by" in header


# ---------- Regression ----------
def test_anon_post_booking_401():
    r = requests.post(f"{BASE_URL}/api/bookings", json={
        "name": "x", "phone": "9", "pass_type": "Early Bird Passes",
        "pass_variant": "single", "quantity": 1, "amount": 1299, "payment_reference": "x"})
    assert r.status_code == 401


def test_admin_bookings_anon_401():
    r = requests.get(f"{BASE_URL}/api/bookings")
    assert r.status_code == 401

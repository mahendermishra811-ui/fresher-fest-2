import { useState } from "react";
import axios from "axios";
import { ArrowUpRight, Copy, ImagePlus, X } from "lucide-react";
import { API, useSettings } from "@/config";

export default function BookingModal({ tier, variant, setVariant, form, setForm, user, onClose, onSubmitted, onNeedAuth }) {
  const { upi_id: UPI_ID } = useSettings();
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const price = tier[variant];
  const quantity = variant === "couple" ? 2 : 1;
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submitBooking = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.phone || !form.payment_reference) {
      setError("Please add your name, phone number and UPI reference.");
      return;
    }
    if (!user) {
      onNeedAuth(tier, variant, form);
      return;
    }
    setBusy(true);
    try {
      let screenshotPath = "";
      if (file) {
        const data = new FormData();
        data.append("file", file);
        const upload = await axios.post(`${API}/uploads/payment-screenshot`, data, { withCredentials: true });
        screenshotPath = upload.data.path;
      }
      const response = await axios.post(
        `${API}/bookings`,
        { ...form, pass_type: tier.name, pass_variant: variant, quantity, amount: price, payment_screenshot: screenshotPath },
        { withCredentials: true }
      );
      onSubmitted(response.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Something went wrong. Please try again or WhatsApp us directly.");
    }
    setBusy(false);
  };

  return (
    <div className="modal-backdrop" data-testid="booking-modal">
      <div className="booking-modal">
        <button className="close-btn" onClick={onClose} aria-label="Close booking" data-testid="close-booking-modal"><X /></button>
        <div className="modal-kicker">YOU’RE BOOKING</div>
        <h2>{tier.name}</h2>
        {user && (
          <div className="signed-in-user" data-testid="signed-in-user">
            {user.picture && <img src={user.picture} alt="" />}
            <span>Signed in as <b>{user.name}</b></span>
          </div>
        )}
        <div className="variant-toggle">
          <button className={variant === "single" ? "active" : ""} onClick={() => setVariant("single")} data-testid="single-variant-button">
            Single <b>₹{tier.single.toLocaleString("en-IN")}</b>
          </button>
          <button className={variant === "couple" ? "active" : ""} onClick={() => setVariant("couple")} data-testid="couple-variant-button">
            Couple <b>₹{tier.couple.toLocaleString("en-IN")}</b>
          </button>
        </div>
        <div className="upi-box">
          <div><span>PAY VIA UPI</span><strong data-testid="upi-id-value">{UPI_ID || "Loading…"}</strong></div>
          <button onClick={() => navigator.clipboard?.writeText(UPI_ID)} data-testid="copy-upi-button"><Copy size={15} /> Copy</button>
        </div>
        <p className="payment-hint">Scan in GPay, PhonePe or Paytm, then paste the UPI reference below. A screenshot helps us confirm faster.</p>
        <form onSubmit={submitBooking}>
          <label>YOUR NAME
            <input name="name" value={form.name} onChange={update} placeholder="Full name" data-testid="booking-name-input" />
          </label>
          <label>PHONE NUMBER
            <input name="phone" value={form.phone} onChange={update} placeholder="10-digit mobile number" data-testid="booking-phone-input" />
          </label>
          <label>EMAIL <span>(prefilled from Google)</span>
            <input name="email" value={form.email} onChange={update} placeholder="you@example.com" data-testid="booking-email-input" />
          </label>
          <label>UPI TRANSACTION REFERENCE
            <input name="payment_reference" value={form.payment_reference} onChange={update} placeholder="e.g. 3264189021" data-testid="payment-reference-input" />
          </label>
          <label className="file-drop" data-testid="screenshot-upload-label">
            <input
              type="file" accept="image/png,image/jpeg,image/webp" hidden
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              data-testid="payment-screenshot-input"
            />
            <ImagePlus size={16} />
            <span>{file ? file.name : "Attach payment screenshot (optional)"}</span>
          </label>
          {error && <div className="form-error" data-testid="booking-error">{error}</div>}
          <button className="submit-btn" type="submit" disabled={busy} data-testid="submit-booking-button">
            {busy ? "Booking…" : user ? `Confirm ₹${price.toLocaleString("en-IN")} booking` : "Continue with Google to confirm"} <ArrowUpRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

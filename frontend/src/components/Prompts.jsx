import { useState } from "react";
import axios from "axios";
import { ArrowUpRight, Check, MessageCircle, X } from "lucide-react";
import { API, useSettings } from "@/config";

export function AuthPrompt({ onClose, onSignIn }) {
  return (
    <div className="modal-backdrop" data-testid="google-signin-modal">
      <div className="confirmation-card">
        <button className="close-btn" onClick={onClose} data-testid="close-google-signin-modal"><X /></button>
        <div className="modal-kicker">ONE QUICK STEP</div>
        <h2>Sign in to confirm.</h2>
        <p>Your name and email will be filled from Google. Your phone number stays required for WhatsApp updates.</p>
        <button className="google-btn" onClick={onSignIn} data-testid="google-signin-button">
          <span>G</span> Continue with Google
        </button>
      </div>
    </div>
  );
}

export function Confirmation({ booking, onClose }) {
  const { whatsapp_url: WHATSAPP_URL } = useSettings();
  return (
    <div className="modal-backdrop" data-testid="confirmation-modal">
      <div className="confirmation-card">
        <div className="success-icon"><Check size={30} /></div>
        <div className="modal-kicker">BOOKING RECEIVED</div>
        <h2>You’re on the list.</h2>
        <p>We’re checking your payment and will send your confirmed pass to <b>{booking.phone}</b> on WhatsApp.</p>
        <div className="pass-id">
          <span>YOUR REFERENCE</span>
          <strong data-testid="booking-reference">{booking.booking_id}</strong>
        </div>
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="submit-btn" data-testid="confirmation-whatsapp-button">
          <MessageCircle size={18} /> Send details on WhatsApp
        </a>
        <button className="text-link close-confirm" onClick={onClose} data-testid="close-confirmation-button">
          Back to the party page
        </button>
      </div>
    </div>
  );
}

export function InterestModal({ onClose }) {
  const [interest, setInterest] = useState({ name: "", phone: "", notes: "" });
  const [sent, setSent] = useState(false);
  const update = (e) => setInterest({ ...interest, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!interest.name || !interest.phone) return;
    await axios.post(`${API}/interests`, interest);
    setSent(true);
  };

  return (
    <div className="modal-backdrop" data-testid="interest-modal">
      <div className="booking-modal">
        <button className="close-btn" onClick={onClose} data-testid="close-interest-modal"><X /></button>
        {sent ? (
          <>
            <div className="success-icon"><Check size={30} /></div>
            <div className="modal-kicker">INTEREST REGISTERED</div>
            <h2>We’ll save you a spot.</h2>
            <p className="payment-hint">Our team will reach out on WhatsApp with group options and the best available price.</p>
            <button className="submit-btn" onClick={onClose} data-testid="close-interest-success-button">Back to passes</button>
          </>
        ) : (
          <>
            <div className="modal-kicker">GROUP BOOKINGS</div>
            <h2>Bring the whole crew.</h2>
            <p className="payment-hint">Tell us how many friends are coming and we’ll help you sort the best deal.</p>
            <form onSubmit={submit}>
              <label>YOUR NAME
                <input name="name" value={interest.name} onChange={update} placeholder="Full name" data-testid="interest-name-input" />
              </label>
              <label>PHONE NUMBER
                <input name="phone" value={interest.phone} onChange={update} placeholder="10-digit mobile number" data-testid="interest-phone-input" />
              </label>
              <label>HOW MANY PEOPLE? <span>(optional)</span>
                <input name="notes" value={interest.notes} onChange={update} placeholder="e.g. 8 friends" data-testid="interest-notes-input" />
              </label>
              <button className="submit-btn" type="submit" data-testid="submit-interest-button">
                Register interest <ArrowUpRight size={18} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

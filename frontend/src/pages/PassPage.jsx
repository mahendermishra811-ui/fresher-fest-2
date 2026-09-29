import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import { CalendarDays, MapPin, MessageCircle, ScanLine, Share2 } from "lucide-react";
import { API, useSettings } from "@/config";
import { Logo } from "@/components/Logo";

const STATUS_COPY = {
  pending_review: { label: "PAYMENT UNDER REVIEW", hint: "We're verifying your UPI payment. This pass becomes valid for entry once confirmed." },
  confirmed: { label: "CONFIRMED · VALID FOR ENTRY", hint: "Show this QR at the gate. One scan per pass." },
  rejected: { label: "NOT CONFIRMED", hint: "We couldn't verify this payment. Message us on WhatsApp and we'll sort it out." },
};

export default function PassPage() {
  const { token } = useParams();
  const { whatsapp_number } = useSettings();
  const [pass, setPass] = useState(undefined);
  const [error, setError] = useState("");
  const passUrl = `${window.location.origin}/pass/${token}`;

  useEffect(() => {
    axios.get(`${API}/pass/${token}`, { withCredentials: true })
      .then((response) => setPass(response.data))
      .catch(() => setPass(null));
  }, [token]);

  const checkIn = async () => {
    setError("");
    try {
      const response = await axios.post(`${API}/pass/${token}/checkin`, {}, { withCredentials: true });
      setPass(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Check-in failed");
    }
  };

  const share = async () => {
    const text = `My Solstice '26 pass — ${pass.booking_id}`;
    if (navigator.share) {
      await navigator.share({ title: text, url: passUrl }).catch(() => {});
    } else {
      await navigator.clipboard?.writeText(passUrl);
    }
  };

  if (pass === undefined) return <div className="admin-shell admin-center" data-testid="pass-loading"><p>Loading your pass…</p></div>;
  if (pass === null) {
    return (
      <div className="admin-shell admin-center" data-testid="pass-not-found">
        <div className="confirmation-card">
          <Logo size={40} />
          <div className="modal-kicker">PASS NOT FOUND</div>
          <h2>This link doesn’t match any booking.</h2>
          <Link to="/" className="text-link close-confirm" data-testid="pass-back-home">Back to the party page</Link>
        </div>
      </div>
    );
  }

  const status = STATUS_COPY[pass.status] || STATUS_COPY.pending_review;
  const isAdmin = "amount" in pass && pass.amount !== 0;
  const helpText = encodeURIComponent(`Hi, about my Solstice '26 pass ${pass.booking_id} (${pass.name}).`);

  return (
    <div className="admin-shell admin-center pass-shell" data-testid="pass-page">
      <article className={`ticket ${pass.status} ${pass.checked_in_at ? "used" : ""}`} data-testid="pass-ticket">
        <header className="ticket-head">
          <div className="brand"><Logo size={28} /><span>SOLSTICE <b>’26</b></span></div>
          <span className="ticket-tier" data-testid="pass-tier">{pass.pass_type}</span>
        </header>
        <div className="ticket-body">
          <div className="ticket-info">
            <div className="modal-kicker">GUEST</div>
            <h1 data-testid="pass-guest-name">{pass.name}</h1>
            <p className="ticket-variant" data-testid="pass-variant">{pass.pass_variant === "couple" ? "Couple pass · admits 2" : "Single pass · admits 1"}</p>
            <div className="ticket-meta">
              <span><CalendarDays size={14} /> Sun, 25 Oct 2026 · 4 PM</span>
              <span><MapPin size={14} /> Punjabi Bagh, New Delhi</span>
            </div>
            <div className="pass-id">
              <span>REFERENCE</span>
              <strong data-testid="pass-reference">{pass.booking_id}</strong>
            </div>
          </div>
          <div className="ticket-qr">
            <div className={`qr-frame ${pass.status !== "confirmed" ? "dim" : ""}`} data-testid="pass-qr">
              <QRCodeSVG value={passUrl} size={168} bgColor="#ffffff" fgColor="#0b0c10" level="M" />
            </div>
            <span className={`status-pill ${pass.status}`} data-testid="pass-status">{status.label}</span>
            {pass.checked_in_at && <span className="checked-in" data-testid="pass-checked-in">CHECKED IN · {new Date(pass.checked_in_at).toLocaleTimeString("en-IN")}</span>}
          </div>
        </div>
        <p className="ticket-hint">{status.hint}</p>
        <div className="ticket-actions">
          <button className="outline-btn small" onClick={share} data-testid="pass-share-button"><Share2 size={14} /> Share pass</button>
          {whatsapp_number && (
            <a className="outline-btn small" href={`https://wa.me/${whatsapp_number}?text=${helpText}`} target="_blank" rel="noreferrer" data-testid="pass-whatsapp-help">
              <MessageCircle size={14} /> Need help?
            </a>
          )}
          <Link to="/" className="text-link" data-testid="pass-home-link">Party page</Link>
        </div>
      </article>

      {isAdmin && (
        <div className="confirmation-card gate-card" data-testid="gate-panel">
          <div className="modal-kicker">ORGANISER · GATE CHECK</div>
          <p><b>{pass.phone}</b> · {pass.email}<br />₹{pass.amount.toLocaleString("en-IN")} · UPI ref {pass.payment_reference}</p>
          {error && <div className="form-error" data-testid="checkin-error">{error}</div>}
          {pass.can_check_in ? (
            <button className="submit-btn" onClick={checkIn} data-testid="checkin-button"><ScanLine size={16} /> Mark as checked in</button>
          ) : (
            <p className="settings-help" data-testid="checkin-unavailable">
              {pass.checked_in_at ? "This pass has already been used." : "Confirm the payment in the dashboard before checking in."}
            </p>
          )}
          <Link to="/admin" className="text-link close-confirm" data-testid="gate-back-admin">Back to dashboard</Link>
        </div>
      )}
    </div>
  );
}

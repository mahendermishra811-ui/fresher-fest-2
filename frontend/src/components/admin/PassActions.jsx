import { Link } from "react-router-dom";
import { MessageCircle, Ticket } from "lucide-react";

const guestWhatsApp = (phone) => {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
};

export default function PassActions({ booking }) {
  const passUrl = `${window.location.origin}/pass/${booking.pass_token}`;
  const text = encodeURIComponent(
    `Hi ${booking.name}! Your Solstice '26 ${booking.pass_type} (${booking.pass_variant}) is confirmed.\nReference: ${booking.booking_id}\nYour digital pass (show at the gate): ${passUrl}\nSee you on 25 Oct at Punjabi Bagh!`
  );
  if (!booking.pass_token) return <span className="no-shot">—</span>;
  return (
    <div className="pass-actions">
      <Link to={`/pass/${booking.pass_token}`} className="icon-btn pass" aria-label="Open pass" data-testid={`open-pass-${booking.booking_id}`}><Ticket size={15} /></Link>
      {booking.status === "confirmed" && (
        <a
          className="icon-btn whatsapp" href={`https://wa.me/${guestWhatsApp(booking.phone)}?text=${text}`}
          target="_blank" rel="noreferrer" aria-label="Send pass on WhatsApp" data-testid={`send-pass-${booking.booking_id}`}
        >
          <MessageCircle size={15} />
        </a>
      )}
      {booking.checked_in_at && <small className="checked-in-tag" data-testid={`checked-in-${booking.booking_id}`}>IN</small>}
    </div>
  );
}

import { useEffect, useState } from "react";
import axios from "axios";
import { MessageCircle, Send } from "lucide-react";
import { API } from "@/config";

const guestNumber = (phone) => {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
};

export const reminderLink = (booking, venue) => {
  const passUrl = `${window.location.origin}/pass/${booking.pass_token}`;
  const text = `Hey ${booking.name}! Solstice '26 is tomorrow 🎉\nSunday 25 Oct · doors 4 PM\nVenue: ${venue}\nYour pass (${booking.booking_id}): ${passUrl}\nShow the QR at the gate. See you there!`;
  return `https://wa.me/${guestNumber(booking.phone)}?text=${encodeURIComponent(text)}`;
};

export default function RemindersPanel({ bookings, onUpdated }) {
  const [filter, setFilter] = useState("unsent");
  const [venue, setVenue] = useState("Punjabi Bagh, New Delhi");
  useEffect(() => {
    axios.get(`${API}/settings/admin`, { withCredentials: true }).then((r) => setVenue(r.data.venue_address)).catch(() => {});
  }, []);
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const unsent = confirmed.filter((b) => !b.reminder_sent_at);
  const visible = filter === "unsent" ? unsent : confirmed;

  const send = async (booking) => {
    window.open(reminderLink(booking, venue), "_blank", "noopener");
    const { data } = await axios.post(`${API}/bookings/${booking.booking_id}/reminder-sent`, {}, { withCredentials: true });
    onUpdated(data);
  };

  return (
    <div data-testid="reminders-panel">
      <div className="tab-row">
        <p className="settings-help reminder-summary" data-testid="reminder-summary">
          <b>{confirmed.length - unsent.length}</b> of <b>{confirmed.length}</b> confirmed guests reminded. Each tap opens WhatsApp with the venue, time and pass link prefilled.
        </p>
        <div className="reminder-actions">
          <button className={`tab-btn ${filter === "unsent" ? "active" : ""}`} onClick={() => setFilter("unsent")} data-testid="reminder-filter-unsent">To send ({unsent.length})</button>
          <button className={`tab-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")} data-testid="reminder-filter-all">All confirmed</button>
          {unsent.length > 0 && (
            <button className="submit-btn share-btn" onClick={() => send(unsent[0])} data-testid="send-next-reminder-button"><Send size={15} /> Send next</button>
          )}
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table" data-testid="reminders-table">
          <thead><tr><th>Guest</th><th>Pass</th><th>Reminder</th><th>Action</th></tr></thead>
          <tbody>
            {visible.map((booking) => (
              <tr key={booking.booking_id} data-testid={`reminder-row-${booking.booking_id}`}>
                <td><b>{booking.name}</b><small>{booking.phone}</small></td>
                <td>{booking.pass_type}<small>{booking.pass_variant} · {booking.booking_id}</small></td>
                <td>{booking.reminder_sent_at ? <span className="status-pill confirmed">sent {new Date(booking.reminder_sent_at).toLocaleDateString("en-IN")}</span> : <span className="status-pill pending_review">not sent</span>}</td>
                <td>
                  <button className="outline-btn small" onClick={() => send(booking)} data-testid={`send-reminder-${booking.booking_id}`}>
                    <MessageCircle size={14} /> {booking.reminder_sent_at ? "Send again" : "Send reminder"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <p className="admin-empty">{filter === "unsent" ? "Everyone confirmed has been reminded." : "No confirmed bookings yet."}</p>}
      </div>
    </div>
  );
}

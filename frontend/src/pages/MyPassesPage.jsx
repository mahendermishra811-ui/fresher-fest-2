import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ArrowUpRight, Ticket } from "lucide-react";
import { API, startGoogleSignIn } from "@/config";
import { Logo } from "@/components/Logo";

export default function MyPassesPage() {
  const [user, setUser] = useState(undefined);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    axios.get(`${API}/auth/me`, { withCredentials: true })
      .then((response) => {
        setUser(response.data);
        return axios.get(`${API}/bookings/mine`, { withCredentials: true }).then((r) => setBookings(r.data));
      })
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) return <div className="admin-shell admin-center" data-testid="my-passes-loading"><p>Loading your passes…</p></div>;

  if (!user) {
    return (
      <div className="admin-shell admin-center" data-testid="my-passes-signin">
        <div className="confirmation-card">
          <Logo size={40} />
          <div className="modal-kicker">YOUR PASSES</div>
          <h2>Sign in to see your passes.</h2>
          <p>Use the same Google account you booked with.</p>
          <button className="google-btn" onClick={() => startGoogleSignIn("/my-passes")} data-testid="my-passes-google-signin-button">
            <span>G</span> Continue with Google
          </button>
          <Link to="/" className="text-link close-confirm" data-testid="my-passes-back-home">Back to the party page</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell my-passes" data-testid="my-passes-page">
      <header className="admin-head">
        <Link to="/" className="brand" data-testid="my-passes-brand"><Logo size={30} /><span>SOLSTICE <b>’26</b></span></Link>
        <div className="admin-user">
          {user.picture && <img src={user.picture} alt="" />}
          <span>{user.name}</span>
          <Link to="/" className="outline-btn small" data-testid="my-passes-view-site">Party page</Link>
        </div>
      </header>
      <div className="modal-kicker" style={{ marginTop: 34 }}>YOUR PASSES</div>
      <h1 className="my-passes-title">{bookings.length ? "Here’s what you’ve got." : "No passes yet."}</h1>
      {!bookings.length && (
        <Link to="/#passes" className="primary-btn" data-testid="my-passes-book-button">Book a pass <ArrowUpRight size={18} /></Link>
      )}
      <div className="my-pass-grid">
        {bookings.map((booking) => (
          <Link to={`/pass/${booking.pass_token}`} className={`my-pass-card ${booking.status}`} key={booking.booking_id} data-testid={`my-pass-${booking.booking_id}`}>
            <div className="pass-top"><span>{booking.pass_type}</span><Ticket size={16} /></div>
            <strong>{booking.booking_id}</strong>
            <small>{booking.pass_variant === "couple" ? "Couple · admits 2" : "Single · admits 1"} · ₹{booking.amount.toLocaleString("en-IN")}</small>
            <span className={`status-pill ${booking.status}`}>{booking.checked_in_at ? "checked in" : booking.status.replace("_", " ")}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

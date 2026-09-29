import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Check, LogOut, Users, Wallet, Ticket, X } from "lucide-react";
import { API, startGoogleSignIn } from "@/config";
import { Logo } from "@/components/Logo";

function Screenshot({ path }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!path) return undefined;
    let objectUrl;
    axios.get(`${API}/files/${path}`, { withCredentials: true, responseType: "blob" })
      .then((response) => {
        objectUrl = URL.createObjectURL(response.data);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => objectUrl && URL.revokeObjectURL(objectUrl);
  }, [path]);
  if (!path) return <span className="no-shot">—</span>;
  if (!url) return <span className="no-shot">Loading…</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img className="shot-thumb" src={url} alt="Payment screenshot" data-testid="payment-screenshot-thumb" />
    </a>
  );
}

export default function AdminPage() {
  const [user, setUser] = useState(undefined);
  const [tab, setTab] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [interests, setInterests] = useState([]);
  const [loadError, setLoadError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [bookingRes, interestRes] = await Promise.all([
        axios.get(`${API}/bookings`, { withCredentials: true }),
        axios.get(`${API}/interests`, { withCredentials: true }),
      ]);
      setBookings(bookingRes.data);
      setInterests(interestRes.data);
      setLoadError("");
    } catch {
      setLoadError("Could not load submissions. Please refresh.");
    }
  }, []);

  useEffect(() => {
    axios.get(`${API}/auth/me`, { withCredentials: true })
      .then((response) => {
        setUser(response.data);
        if (response.data.is_admin) loadData();
      })
      .catch(() => setUser(null));
  }, [loadData]);

  const setStatus = async (bookingId, status) => {
    const response = await axios.patch(`${API}/bookings/${bookingId}`, { status }, { withCredentials: true });
    setBookings((current) => current.map((item) => (item.booking_id === bookingId ? response.data : item)));
  };

  const logout = async () => {
    await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    setUser(null);
  };

  if (user === undefined) {
    return <div className="admin-shell admin-center" data-testid="admin-loading"><p>Loading organiser panel…</p></div>;
  }

  if (!user) {
    return (
      <div className="admin-shell admin-center" data-testid="admin-signin">
        <div className="confirmation-card">
          <Logo size={40} />
          <div className="modal-kicker">ORGANISER ACCESS</div>
          <h2>Sign in to review bookings.</h2>
          <p>Use the Google account registered as organiser for Solstice ’26.</p>
          <button className="google-btn" onClick={() => startGoogleSignIn("/admin")} data-testid="admin-google-signin-button">
            <span>G</span> Continue with Google
          </button>
          <Link to="/" className="text-link close-confirm" data-testid="admin-back-home">Back to the party page</Link>
        </div>
      </div>
    );
  }

  if (!user.is_admin) {
    return (
      <div className="admin-shell admin-center" data-testid="admin-denied">
        <div className="confirmation-card">
          <div className="modal-kicker">ACCESS LIMITED</div>
          <h2>This account is not an organiser.</h2>
          <p>Signed in as <b>{user.email}</b>. Ask the organiser to grant this email access, or sign in with the organiser account.</p>
          <button className="submit-btn" onClick={logout} data-testid="admin-switch-account-button"><LogOut size={16} /> Switch account</button>
          <Link to="/" className="text-link close-confirm" data-testid="admin-denied-back-home">Back to the party page</Link>
        </div>
      </div>
    );
  }

  const revenue = bookings.filter((b) => b.status !== "rejected").reduce((sum, b) => sum + b.amount, 0);
  const pending = bookings.filter((b) => b.status === "pending_review").length;

  return (
    <div className="admin-shell" data-testid="admin-dashboard">
      <header className="admin-head">
        <div className="brand"><Logo size={30} /><span>SOLSTICE <b>’26</b> · ORGANISER</span></div>
        <div className="admin-user">
          {user.picture && <img src={user.picture} alt="" />}
          <span>{user.name}</span>
          <Link to="/" className="outline-btn small" data-testid="admin-view-site">View site</Link>
          <button className="outline-btn small" onClick={logout} data-testid="admin-logout-button"><LogOut size={14} /> Logout</button>
        </div>
      </header>

      <div className="admin-stats">
        <div className="stat-card" data-testid="stat-bookings"><Ticket size={18} /><strong>{bookings.length}</strong><span>Total bookings</span></div>
        <div className="stat-card" data-testid="stat-revenue"><Wallet size={18} /><strong>₹{revenue.toLocaleString("en-IN")}</strong><span>Expected revenue</span></div>
        <div className="stat-card" data-testid="stat-pending"><Check size={18} /><strong>{pending}</strong><span>Pending review</span></div>
        <div className="stat-card" data-testid="stat-interests"><Users size={18} /><strong>{interests.length}</strong><span>Group interests</span></div>
      </div>

      <div className="admin-tabs">
        <button className={`tab-btn ${tab === "bookings" ? "active" : ""}`} onClick={() => setTab("bookings")} data-testid="tab-bookings">Bookings</button>
        <button className={`tab-btn ${tab === "interests" ? "active" : ""}`} onClick={() => setTab("interests")} data-testid="tab-interests">Group interests</button>
      </div>

      {loadError && <div className="form-error" data-testid="admin-load-error">{loadError}</div>}

      {tab === "bookings" && (
        <div className="table-wrap">
          <table className="data-table" data-testid="bookings-table">
            <thead>
              <tr><th>Reference</th><th>Guest</th><th>Pass</th><th>Amount</th><th>UPI ref</th><th>Screenshot</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.booking_id} data-testid={`booking-row-${booking.booking_id}`}>
                  <td><b>{booking.booking_id}</b><small>{new Date(booking.created_at).toLocaleString("en-IN")}</small></td>
                  <td><b>{booking.name}</b><small>{booking.phone} · {booking.email}</small></td>
                  <td>{booking.pass_type}<small>{booking.pass_variant} × {booking.quantity}</small></td>
                  <td>₹{booking.amount.toLocaleString("en-IN")}</td>
                  <td>{booking.payment_reference}</td>
                  <td><Screenshot path={booking.payment_screenshot} /></td>
                  <td><span className={`status-pill ${booking.status}`} data-testid={`status-${booking.booking_id}`}>{booking.status.replace("_", " ")}</span></td>
                  <td>
                    {booking.status !== "confirmed" && (
                      <button className="icon-btn confirm" onClick={() => setStatus(booking.booking_id, "confirmed")} aria-label="Confirm booking" data-testid={`confirm-${booking.booking_id}`}><Check size={15} /></button>
                    )}
                    {booking.status !== "rejected" && (
                      <button className="icon-btn reject" onClick={() => setStatus(booking.booking_id, "rejected")} aria-label="Reject booking" data-testid={`reject-${booking.booking_id}`}><X size={15} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!bookings.length && <p className="admin-empty">No bookings yet. Share the page and they’ll show up here.</p>}
        </div>
      )}

      {tab === "interests" && (
        <div className="table-wrap">
          <table className="data-table" data-testid="interests-table">
            <thead>
              <tr><th>Reference</th><th>Name</th><th>Phone</th><th>Group details</th><th>Received</th></tr>
            </thead>
            <tbody>
              {interests.map((item) => (
                <tr key={item.interest_id} data-testid={`interest-row-${item.interest_id}`}>
                  <td><b>{item.interest_id}</b></td>
                  <td>{item.name}</td>
                  <td>{item.phone}</td>
                  <td>{item.notes || "—"}</td>
                  <td>{new Date(item.created_at).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!interests.length && <p className="admin-empty">No group interests yet.</p>}
        </div>
      )}
    </div>
  );
}

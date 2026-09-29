import { useEffect, useState } from "react";
import axios from "axios";
import { Trophy } from "lucide-react";
import { API } from "@/config";

export default function ReferralsPanel() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    axios.get(`${API}/referrals`, { withCredentials: true }).then((r) => setRows(r.data)).catch(() => setRows([]));
  }, []);

  if (!rows) return <p className="admin-empty" data-testid="referrals-loading">Loading leaderboard…</p>;

  return (
    <div data-testid="referrals-panel">
      <p className="settings-help reminder-summary">
        Every signed-in guest gets an invite link (on their My Passes page). Bookings made through it are counted here — pick your prize winner on the night.
      </p>
      <div className="table-wrap">
        <table className="data-table" data-testid="referrals-table">
          <thead><tr><th>Rank</th><th>Guest</th><th>Code</th><th>Bookings</th><th>Friends brought</th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.referral_code} data-testid={`referral-row-${row.referral_code}`}>
                <td><b>{index === 0 ? <Trophy size={16} className="trophy" /> : `#${index + 1}`}</b></td>
                <td><b>{row.name || "—"}</b><small>{row.email}</small></td>
                <td>{row.referral_code}</td>
                <td>{row.bookings}</td>
                <td><b data-testid={`referral-guests-${row.referral_code}`}>{row.guests}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="admin-empty">No referred bookings yet. Guests can share their invite link from My Passes.</p>}
      </div>
    </div>
  );
}

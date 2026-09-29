import { useEffect, useState } from "react";
import axios from "axios";
import { Copy, Gift, MessageCircle } from "lucide-react";
import { API } from "@/config";

export default function InviteCard({ user }) {
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${window.location.origin}/?ref=${user.referral_code}`;
  const text = encodeURIComponent(`Come to Solstice '26 with me — DU SOL Freshers Party, 25 Oct, Punjabi Bagh! Book with my link: ${inviteUrl}`);

  useEffect(() => {
    axios.get(`${API}/referrals/mine`, { withCredentials: true }).then((r) => setStats(r.data)).catch(() => setStats({ bookings: 0, guests: 0 }));
  }, []);

  const copy = async () => {
    await navigator.clipboard?.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!user.referral_code) return null;

  return (
    <div className="invite-card" data-testid="invite-card">
      <div className="invite-copy">
        <div className="modal-kicker"><Gift size={12} /> BRING FRIENDS, WIN ON THE NIGHT</div>
        <h3>Your invite link</h3>
        <p>Every friend who books through your link counts towards the referral prize announced at the party.</p>
        <div className="invite-link" data-testid="invite-link">{inviteUrl}</div>
        <div className="ticket-actions">
          <button className="outline-btn small" onClick={copy} data-testid="copy-invite-button"><Copy size={14} /> {copied ? "Copied!" : "Copy link"}</button>
          <a className="submit-btn share-btn" href={`https://wa.me/?text=${text}`} target="_blank" rel="noreferrer" data-testid="share-invite-whatsapp"><MessageCircle size={15} /> Share on WhatsApp</a>
        </div>
      </div>
      <div className="invite-stats">
        <strong data-testid="invite-guests-count">{stats ? stats.guests : "…"}</strong>
        <span>friends brought</span>
        <small data-testid="invite-code">Code {user.referral_code}</small>
      </div>
    </div>
  );
}

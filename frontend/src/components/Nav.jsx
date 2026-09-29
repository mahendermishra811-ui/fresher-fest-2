import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, MessageCircle, X } from "lucide-react";
import { Logo } from "./Logo";
import { useSettings } from "@/config";

export default function Nav({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { whatsapp_url: WHATSAPP_URL } = useSettings();
  return (
    <nav className="nav-wrap" data-testid="main-navigation">
      <a href="#top" className="brand" data-testid="brand-home">
        <Logo size={30} />
        <span>
          SOLSTICE <b>’26</b>
        </span>
      </a>
      <div className={`nav-links ${menuOpen ? "open" : ""}`} data-testid="navigation-links">
        <a href="#passes" data-testid="nav-passes" onClick={() => setMenuOpen(false)}>Passes</a>
        <a href="#experience" data-testid="nav-experience" onClick={() => setMenuOpen(false)}>The night</a>
        <a href="#details" data-testid="nav-details" onClick={() => setMenuOpen(false)}>Details</a>
        {user?.is_admin && (
          <Link to="/admin" data-testid="nav-admin-link">Organiser</Link>
        )}
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="nav-chat" data-testid="nav-whatsapp">
          <MessageCircle size={16} /> WhatsApp us
        </a>
      </div>
      <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" data-testid="mobile-menu-button">
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
    </nav>
  );
}

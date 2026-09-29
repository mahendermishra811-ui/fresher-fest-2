import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { API, PASS_TIERS, startGoogleSignIn } from "@/config";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Ticker from "@/components/Ticker";
import Experience from "@/components/Experience";
import Passes from "@/components/Passes";
import Details from "@/components/Details";
import WideImage from "@/components/WideImage";
import BookingModal from "@/components/BookingModal";
import ShareCard from "@/components/ShareCard";
import { AuthPrompt, Confirmation, InterestModal } from "@/components/Prompts";
import { Logo } from "@/components/Logo";
import { Instagram } from "lucide-react";

export default function PartyPage() {
  const location = useLocation();
  const [selected, setSelected] = useState(null);
  const [variant, setVariant] = useState("single");
  const [submitted, setSubmitted] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", payment_reference: "", notes: "" });
  const [interestOpen, setInterestOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authPrompt, setAuthPrompt] = useState(false);

  useEffect(() => {
    axios.get(`${API}/auth/me`, { withCredentials: true })
      .then((response) => setUser(response.data))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user || location.hash !== "#booking") return;
    const pending = sessionStorage.getItem("pending_booking");
    if (!pending) return;
    const saved = JSON.parse(pending);
    const tier = PASS_TIERS.find((item) => item.id === saved.tierId);
    if (tier) {
      setSelected(tier);
      setVariant(saved.variant);
      setForm(saved.form);
    }
    sessionStorage.removeItem("pending_booking");
  }, [location.hash, user]);

  useEffect(() => {
    if (user) setForm((current) => ({ ...current, name: current.name || user.name, email: current.email || user.email }));
  }, [user]);

  const handleNeedAuth = (tier, currentVariant, currentForm) => {
    sessionStorage.setItem("pending_booking", JSON.stringify({ tierId: tier.id, variant: currentVariant, form: currentForm }));
    setSelected(null);
    setAuthPrompt(true);
  };

  return (
    <div className="site-shell">
      <div className="grain" aria-hidden="true" />
      <Nav user={user} />
      <main>
        <Hero />
        <Ticker />
        <Experience />
        <Passes onSelect={(tier) => { setSelected(tier); setVariant("single"); }} onGroupInterest={() => setInterestOpen(true)} />
        <Details onShare={() => setShareOpen(true)} />
        <WideImage />
      </main>
      <footer>
        <div className="brand"><Logo size={26} /><span>SOLSTICE <b>’26</b></span></div>
        <span>© 2026 DU SOL FRESHERS PARTY · PUNJABI BAGH · MADE FOR THE CLASS OF ’26</span>
        <a href="https://instagram.com" target="_blank" rel="noreferrer" data-testid="instagram-link" aria-label="Instagram"><Instagram size={18} /></a>
      </footer>

      {selected && (
        <BookingModal
          tier={selected}
          variant={variant}
          setVariant={setVariant}
          form={form}
          setForm={setForm}
          user={user}
          onClose={() => setSelected(null)}
          onSubmitted={(booking) => { setSubmitted(booking); setSelected(null); }}
          onNeedAuth={handleNeedAuth}
        />
      )}
      {authPrompt && (
        <AuthPrompt onClose={() => setAuthPrompt(false)} onSignIn={() => startGoogleSignIn("/#booking")} />
      )}
      {submitted && <Confirmation booking={submitted} onClose={() => setSubmitted(null)} />}
      {interestOpen && <InterestModal onClose={() => setInterestOpen(false)} />}
      {shareOpen && <ShareCard onClose={() => setShareOpen(false)} />}
    </div>
  );
}

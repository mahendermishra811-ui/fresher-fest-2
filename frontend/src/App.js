import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowUpRight, Check, ChevronDown, Copy, Flame, Instagram, MapPin, Menu, MessageCircle, Music2, Sparkles, Ticket, Utensils, X, Zap } from "lucide-react";
import "@/App.css";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const passTiers = [
  { id: "silver", number: "01", name: "Early Bird Passes", window: "Active now · closes 5 October", tagline: "The best price for the quickest ones", single: 1299, couple: 2199, perks: ["Party entry", "Unlimited buffet", "Mocktail welcome drink"], tone: "silver" },
  { id: "gold", number: "02", name: "Not Late Passes", window: "6 October – 20 October", tagline: "Still early enough to lock it in", single: 1499, couple: 2599, perks: ["Priority entry", "Unlimited buffet + mocktails", "Dance floor fast lane"], tone: "gold", popular: true },
  { id: "diamond", number: "03", name: "Last Minute Arrivals", window: "21 October – 25 October · Diamond VIP", tagline: "For the ones who make an entrance", single: 1999, couple: 2999, perks: ["VIP lounge access", "Premium bar counters", "Front stage viewing"], tone: "diamond" },
];

const getLivePrice = (base, couple = false) => {
  return base;
};
const getCountdown = () => {
  const difference = Math.max(0, new Date("2026-10-25T16:00:00") - new Date());
  return { days: Math.floor(difference / 86400000), hours: Math.floor((difference / 3600000) % 24), minutes: Math.floor((difference / 60000) % 60) };
};

function App() {
  const [selected, setSelected] = useState(null);
  const [variant, setVariant] = useState("single");
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", payment_reference: "", notes: "" });
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(getCountdown());
  const [interestOpen, setInterestOpen] = useState(false);
  const [interestSent, setInterestSent] = useState(false);
  const [interest, setInterest] = useState({ name: "", phone: "", notes: "" });
  useEffect(() => { const timer = setInterval(() => setTimeLeft(getCountdown()), 60000); return () => clearInterval(timer); }, []);

  const openBooking = (tier) => { setSelected(tier); setVariant("single"); setError(""); };
  const price = selected ? getLivePrice(selected[variant], variant === "couple") : 0;
  const quantity = variant === "couple" ? 2 : 1;
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const updateInterest = (e) => setInterest({ ...interest, [e.target.name]: e.target.value });

  const submitBooking = async (e) => {
    e.preventDefault(); setError("");
    if (!form.name || !form.phone || !form.payment_reference) { setError("Please add your name, phone number and UPI reference."); return; }
    try {
      const response = await axios.post(`${API}/bookings`, { ...form, pass_type: selected.name, pass_variant: variant, quantity, amount: price });
      setSubmitted(response.data); setSelected(null);
    } catch { setError("Something went wrong. Please try again or WhatsApp us directly."); }
  };
  const submitInterest = async (e) => { e.preventDefault(); if (!interest.name || !interest.phone) return; await axios.post(`${API}/interests`, interest); setInterestSent(true); };

  const whatsapp = "https://wa.me/919999999999?text=Hi%20DU%20SOL%20Freshers%20team%2C%20I%20want%20to%20book%20passes%20for%20October%2025%2C%202026.";

  return <div className="site-shell">
    <nav className="nav-wrap" data-testid="main-navigation">
      <a href="#top" className="brand" data-testid="brand-home"><span className="brand-mark">DS</span><span>DU SOL <b>FRESHERS</b></span></a>
      <div className={`nav-links ${menuOpen ? "open" : ""}`} data-testid="navigation-links">
        <a href="#passes" data-testid="nav-passes">Passes</a><a href="#experience" data-testid="nav-experience">The night</a><a href="#details" data-testid="nav-details">Details</a>
        <a href={whatsapp} target="_blank" rel="noreferrer" className="nav-chat" data-testid="nav-whatsapp"><MessageCircle size={16}/> WhatsApp us</a>
      </div>
      <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu" data-testid="mobile-menu-button"><Menu size={22}/></button>
    </nav>

    <main id="top">
      <section className="hero section-pad">
        <div className="hero-copy reveal"><div className="eyebrow"><span className="live-dot"/> Delhi’s loudest Freshers celebration</div>
          <h1>YOUR<br/><em>FIRST</em><br/>NIGHT OUT.</h1>
          <p className="hero-text">A neon-soaked celebration for the DU SOL Class of 2026. Come for the pass. Leave with the story.</p>
          <div className="hero-actions"><a href="#passes" className="primary-btn" data-testid="hero-get-pass-button">Get your pass <ArrowUpRight size={18}/></a><a href={whatsapp} target="_blank" rel="noreferrer" className="text-link" data-testid="hero-whatsapp-link"><MessageCircle size={17}/> Talk to the team</a></div>
          <div className="hero-meta"><span><b>25</b> OCT ’26</span><span className="meta-line"/><span><b>04:00</b> PM ONWARDS</span></div><div className="countdown" data-testid="event-countdown"><span>COUNTDOWN</span><b>{String(timeLeft.days).padStart(2,"0")}</b><i>:</i><b>{String(timeLeft.hours).padStart(2,"0")}</b><i>:</i><b>{String(timeLeft.minutes).padStart(2,"0")}</b><small>DAYS&nbsp;&nbsp;&nbsp; HRS&nbsp;&nbsp;&nbsp; MIN</small></div>
        </div>
        <div className="hero-visual reveal reveal-delay"><div className="hero-image"><img src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=85" alt="Neon festival crowd"/><div className="image-shade"/><div className="hero-sticker"><span>DU SOL</span><strong>26</strong><span>ALL NIGHT</span></div><div className="hero-caption"><span>01 / 03</span><span>TURN IT UP <ArrowUpRight size={14}/></span></div></div></div>
      </section>

      <section className="ticker" data-testid="event-ticker"><div><span>★</span> EARLY BIRD PRICES END SOON <span>★</span> ONE NIGHT ONLY <span>★</span> OCTOBER 18, 2026 <span>★</span> EARLY BIRD PRICES END SOON <span>★</span></div></section>

      <section className="intro section-pad" id="experience"><div className="section-label">THE VIBE / 01</div><div className="intro-grid"><h2>This is not<br/>a <em>function.</em></h2><div className="intro-content"><p className="big-copy">This is your first iconic night as a DU SOL legend.</p><p>Expect a room full of new faces, old friends, heavy bass and the kind of energy that makes Monday feel very far away.</p><div className="feature-row"><span><Music2/> <b>Live DJs</b></span><span><Utensils/> <b>Unlimited food</b></span><span><Sparkles/> <b>Mocktails + bar</b></span></div></div></div></section>

      <section className="passes section-pad" id="passes"><div className="section-heading"><div><div className="section-label">CHOOSE YOUR NIGHT / 02</div><h2>Pick your <em>energy.</em></h2></div><div className="price-note"><Flame size={18}/> Prices rise as the date gets closer</div></div>
        <div className="pass-grid">{passTiers.map((tier) => <article className={`pass-card ${tier.tone} ${tier.popular ? "popular" : ""}`} key={tier.id} data-testid={`pass-card-${tier.id}`}>
          {tier.popular && <div className="popular-tag"><Zap size={13}/> MOST LOVED</div>}<div className="pass-top"><span className="pass-number">{tier.number}</span><span className="pass-type">{tier.id === "diamond" ? "DIAMOND VIP" : "ENTRY PASS"}</span></div><h3>{tier.name}</h3><p className="pass-window" data-testid={`${tier.id}-pass-window`}>{tier.window}</p><p className="pass-tagline">{tier.tagline}</p><div className="price-pair"><div><small>SINGLE</small><strong>₹{getLivePrice(tier.single).toLocaleString("en-IN")}</strong></div><div><small>COUPLE</small><strong>₹{getLivePrice(tier.couple, true).toLocaleString("en-IN")}</strong></div></div><ul>{tier.perks.map((perk) => <li key={perk}><Check size={16}/>{perk}</li>)}</ul><button className="pass-btn" onClick={() => openBooking(tier)} data-testid={`select-${tier.id}-pass-button`}>Select this pass <ArrowUpRight size={17}/></button>
        </article>)}</div><p className="pass-footnote"><span className="green-dot"/> All prices include taxes &amp; booking support <span className="foot-divider"/> Need a group booking? <button className="inline-action" onClick={() => setInterestOpen(true)} data-testid="group-interest-button">Register your interest</button></p></section>

      <section className="details section-pad" id="details"><div className="section-label">SAVE THE DATE / 03</div><div className="details-grid"><div className="detail-lead"><h2>One night.<br/><em>Zero regrets.</em></h2><a href="#passes" className="outline-btn" data-testid="details-choose-pass-button">Choose your pass <ArrowUpRight size={17}/></a></div><div className="detail-list"><div className="detail-item"><span>WHEN</span><strong>Sunday, October 25, 2026</strong><small>4:00 PM onwards · Doors close at 10:30 PM</small></div><div className="detail-item"><span>WHERE</span><strong>Kingdom Arena, North Campus</strong><small><MapPin size={14}/> Delhi, India</small></div><div className="detail-item"><span>WHAT’S ON</span><strong>DJ Ravish × DJ Krypton</strong><small>Multi-cuisine buffet · Premium mocktails · Bar counters</small></div></div></div></section>
      <section className="experience-image section-pad"><div className="wide-image"><img src="https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&w=1600&q=85" alt="Party lights and crowd"/><div className="wide-overlay"><span>THE ROOM WILL BE LOUD.</span><b>BE THERE.</b></div></div></section>
    </main>
    <footer><div className="brand"><span className="brand-mark">DS</span><span>DU SOL <b>FRESHERS</b></span></div><span>© 2026 DU SOL FRESHERS · MADE FOR THE CLASS OF ’26</span><a href="https://instagram.com" target="_blank" rel="noreferrer" data-testid="instagram-link"><Instagram size={18}/></a></footer>

    {selected && <div className="modal-backdrop" data-testid="booking-modal"><div className="booking-modal"><button className="close-btn" onClick={() => setSelected(null)} aria-label="Close booking" data-testid="close-booking-modal"><X/></button><div className="modal-kicker">YOU’RE BOOKING</div><h2>{selected.name}</h2><div className="variant-toggle"><button className={variant === "single" ? "active" : ""} onClick={() => setVariant("single")} data-testid="single-variant-button">Single <b>₹{getLivePrice(selected.single).toLocaleString("en-IN")}</b></button><button className={variant === "couple" ? "active" : ""} onClick={() => setVariant("couple")} data-testid="couple-variant-button">Couple <b>₹{getLivePrice(selected.couple, true).toLocaleString("en-IN")}</b></button></div><div className="upi-box"><div><span>PAY VIA UPI</span><strong>dusol2026@oksbi</strong></div><button onClick={() => navigator.clipboard?.writeText("dusol2026@oksbi")} data-testid="copy-upi-button"><Copy size={15}/> Copy</button></div><p className="payment-hint">Scan in GPay, PhonePe or Paytm, then paste the UPI reference below.</p><form onSubmit={submitBooking}><label>YOUR NAME<input name="name" value={form.name} onChange={update} placeholder="Full name" data-testid="booking-name-input"/></label><label>PHONE NUMBER<input name="phone" value={form.phone} onChange={update} placeholder="10-digit mobile number" data-testid="booking-phone-input"/></label><label>EMAIL <span>(optional)</span><input name="email" value={form.email} onChange={update} placeholder="you@example.com" data-testid="booking-email-input"/></label><label>UPI TRANSACTION REFERENCE<input name="payment_reference" value={form.payment_reference} onChange={update} placeholder="e.g. 3264189021" data-testid="payment-reference-input"/></label>{error && <div className="form-error" data-testid="booking-error">{error}</div>}<button className="submit-btn" type="submit" data-testid="submit-booking-button">Confirm ₹{price.toLocaleString("en-IN")} booking <ArrowUpRight size={18}/></button></form></div></div>}
    {submitted && <div className="modal-backdrop" data-testid="confirmation-modal"><div className="confirmation-card"><div className="success-icon"><Check size={30}/></div><div className="modal-kicker">BOOKING RECEIVED</div><h2>You’re on the list.</h2><p>We’re checking your payment and will send your confirmed pass to <b>{submitted.phone}</b> on WhatsApp.</p><div className="pass-id"><span>YOUR REFERENCE</span><strong data-testid="booking-reference">{submitted.booking_id}</strong></div><a href={whatsapp} target="_blank" rel="noreferrer" className="submit-btn" data-testid="confirmation-whatsapp-button"><MessageCircle size={18}/> Send details on WhatsApp</a><button className="text-link close-confirm" onClick={() => setSubmitted(null)} data-testid="close-confirmation-button">Back to the party page</button></div></div>}
    {interestOpen && <div className="modal-backdrop" data-testid="interest-modal"><div className="booking-modal"><button className="close-btn" onClick={() => setInterestOpen(false)} data-testid="close-interest-modal"><X/></button>{interestSent ? <><div className="success-icon"><Check size={30}/></div><div className="modal-kicker">INTEREST REGISTERED</div><h2>We’ll save you a spot.</h2><p className="payment-hint">Our team will reach out on WhatsApp with group options and the best available price.</p><button className="submit-btn" onClick={() => setInterestOpen(false)} data-testid="close-interest-success-button">Back to passes</button></> : <><div className="modal-kicker">GROUP BOOKINGS</div><h2>Bring the whole crew.</h2><p className="payment-hint">Tell us how many friends are coming and we’ll help you sort the best deal.</p><form onSubmit={submitInterest}><label>YOUR NAME<input name="name" value={interest.name} onChange={updateInterest} placeholder="Full name" data-testid="interest-name-input"/></label><label>PHONE NUMBER<input name="phone" value={interest.phone} onChange={updateInterest} placeholder="10-digit mobile number" data-testid="interest-phone-input"/></label><label>HOW MANY PEOPLE? <span>(optional)</span><input name="notes" value={interest.notes} onChange={updateInterest} placeholder="e.g. 8 friends" data-testid="interest-notes-input"/></label><button className="submit-btn" type="submit" data-testid="submit-interest-button">Register interest <ArrowUpRight size={18}/></button></form></>}</div></div>}
  </div>;
}

export default App;
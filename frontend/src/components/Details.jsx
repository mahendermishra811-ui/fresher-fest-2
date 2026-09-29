import { ArrowUpRight, MapPin } from "lucide-react";
import { Reveal } from "./Reveal";

const facts = [
  { label: "WHEN", title: "Sunday, October 25, 2026", sub: "4:00 PM onwards · Doors close at 10:30 PM" },
  { label: "WHERE", title: "Punjabi Bagh, New Delhi", sub: "Exact venue shared with pass holders on WhatsApp", icon: true },
  { label: "WHAT’S ON", title: "DJ sets · Buffet · Mocktails", sub: "Multi-cuisine buffet · Premium mocktails · Bar counters" },
];

export default function Details() {
  return (
    <section className="details section-pad" id="details">
      <Reveal className="section-label">SAVE THE DATE / 03</Reveal>
      <div className="details-grid">
        <div className="detail-lead">
          <Reveal delay={0.05}>
            <h2>One night.<br /><em>Zero regrets.</em></h2>
          </Reveal>
          <Reveal delay={0.15}>
            <a href="#passes" className="outline-btn" data-testid="details-choose-pass-button">
              Choose your pass <ArrowUpRight size={17} />
            </a>
          </Reveal>
        </div>
        <div className="detail-list">
          {facts.map((fact, index) => (
            <Reveal key={fact.label} delay={index * 0.1} className="detail-item">
              <span>{fact.label}</span>
              <strong>{fact.title}</strong>
              <small>{fact.icon && <MapPin size={14} />} {fact.sub}</small>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

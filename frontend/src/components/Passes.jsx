import { motion } from "framer-motion";
import { ArrowUpRight, Check, Flame, Zap } from "lucide-react";
import { Reveal } from "./Reveal";
import { PASS_TIERS, tierState } from "@/config";

const statusLabel = { live: "SELLING NOW", upcoming: "OPENS SOON", closed: "CLOSED" };

export default function Passes({ onSelect, onGroupInterest }) {
  return (
    <section className="passes section-pad" id="passes">
      <div className="section-heading">
        <div>
          <Reveal className="section-label">CHOOSE YOUR NIGHT / 02</Reveal>
          <Reveal delay={0.08}>
            <h2>Pick your <em>energy.</em></h2>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="price-note">
          <Flame size={18} /> Prices rise as the date gets closer
        </Reveal>
      </div>
      <div className="pass-grid">
        {PASS_TIERS.map((tier, index) => {
          const state = tierState(tier);
          return (
            <Reveal key={tier.id} delay={index * 0.12}>
              <motion.article
                className={`pass-card ${tier.tone} ${tier.popular ? "popular" : ""} ${state !== "live" ? "is-locked" : ""}`}
                whileHover={state === "live" ? { y: -8 } : {}}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                data-testid={`pass-card-${tier.id}`}
              >
                {tier.popular && (
                  <div className="popular-tag"><Zap size={13} /> MOST LOVED</div>
                )}
                <div className="pass-top">
                  <span className="pass-number">{tier.number}</span>
                  <span className="pass-type">{tier.id === "diamond" ? "DIAMOND VIP" : "ENTRY PASS"}</span>
                </div>
                <h3>{tier.name}</h3>
                <p className="pass-window" data-testid={`${tier.id}-pass-window`}>{tier.window}</p>
                <p className="pass-tagline">{tier.tagline}</p>
                <div className="price-pair">
                  <div><small>SINGLE</small><strong>₹{tier.single.toLocaleString("en-IN")}</strong></div>
                  <div><small>COUPLE</small><strong>₹{tier.couple.toLocaleString("en-IN")}</strong></div>
                </div>
                <ul>
                  {tier.perks.map((perk) => (
                    <li key={perk}><Check size={16} />{perk}</li>
                  ))}
                </ul>
                <button
                  className="pass-btn"
                  onClick={() => onSelect(tier)}
                  disabled={state !== "live"}
                  data-testid={`select-${tier.id}-pass-button`}
                >
                  {state === "live" ? <>Select this pass <ArrowUpRight size={17} /></> : statusLabel[state]}
                </button>
                <span className={`pass-status ${state}`} data-testid={`${tier.id}-pass-status`}>{statusLabel[state]}</span>
              </motion.article>
            </Reveal>
          );
        })}
      </div>
      <Reveal delay={0.2} className="pass-footnote">
        <span className="green-dot" /> All prices include taxes &amp; booking support
        <span className="foot-divider" /> Need a group booking?{" "}
        <button className="inline-action" onClick={onGroupInterest} data-testid="group-interest-button">
          Register your interest
        </button>
      </Reveal>
    </section>
  );
}

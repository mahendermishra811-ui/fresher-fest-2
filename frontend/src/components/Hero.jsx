import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { HERO_IMAGE, WHATSAPP_URL, getCountdown } from "@/config";

const lineEase = [0.16, 1, 0.3, 1];

const MaskedLine = ({ children, delay }) => (
  <span className="h-line">
    <motion.span
      initial={{ y: "112%" }}
      animate={{ y: 0 }}
      transition={{ duration: 0.95, delay, ease: lineEase }}
    >
      {children}
    </motion.span>
  </span>
);

export default function Hero() {
  const [timeLeft, setTimeLeft] = useState(getCountdown());
  const visualRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: visualRef, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "8%"]);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getCountdown()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="hero section-pad" id="top">
      <div className="hero-copy">
        <motion.div className="eyebrow" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="live-dot" /> DU SOL FRESHERS PARTY · PUNJABI BAGH, DELHI
        </motion.div>
        <h1>
          <MaskedLine delay={0.15}>YOUR FIRST</MaskedLine>
          <MaskedLine delay={0.3}>
            <em>NIGHT OUT</em>
          </MaskedLine>
          <MaskedLine delay={0.45}>STARTS HERE.</MaskedLine>
        </h1>
        <motion.p
          className="hero-text"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65 }}
        >
          Solstice ’26 — the official DU SOL Freshers Party. A neon-soaked celebration for the Class of 2026. Come for the pass. Leave with the story.
        </motion.p>
        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
        >
          <a href="#passes" className="primary-btn" data-testid="hero-get-pass-button">
            Get your pass <ArrowUpRight size={18} />
          </a>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="text-link" data-testid="hero-whatsapp-link">
            <MessageCircle size={17} /> Talk to the team
          </a>
        </motion.div>
        <motion.div
          className="hero-meta"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <span><b>25</b> OCT ’26</span>
          <span className="meta-line" />
          <span><b>04:00</b> PM ONWARDS</span>
        </motion.div>
        <motion.div
          className="countdown"
          data-testid="event-countdown"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.15 }}
        >
          <span>COUNTDOWN</span>
          <b>{String(timeLeft.days).padStart(2, "0")}</b><i>:</i>
          <b>{String(timeLeft.hours).padStart(2, "0")}</b><i>:</i>
          <b>{String(timeLeft.minutes).padStart(2, "0")}</b>
          <small>DAYS&nbsp;&nbsp;&nbsp; HRS&nbsp;&nbsp;&nbsp; MIN</small>
        </motion.div>
      </div>
      <div className="hero-visual spotlight" ref={visualRef}>
        <motion.div
          className="hero-image"
          initial={{ clipPath: "inset(100% 0 0 0)" }}
          animate={{ clipPath: "inset(0% 0 0 0)" }}
          transition={{ duration: 1.15, delay: 0.5, ease: lineEase }}
        >
          <motion.img src={HERO_IMAGE} alt="Neon festival crowd" style={{ y }} />
          <div className="image-shade" />
          <motion.div
            className="hero-sticker"
            initial={{ scale: 0, rotate: 30 }}
            animate={{ scale: 1, rotate: 8 }}
            transition={{ type: "spring", stiffness: 180, damping: 14, delay: 1.2 }}
          >
            <span>DU SOL</span>
            <strong>26</strong>
            <span>ALL NIGHT</span>
          </motion.div>
          <div className="hero-caption">
            <span>01 / 03</span>
            <span>TURN IT UP <ArrowUpRight size={14} /></span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

import { Music2, Sparkles, Utensils } from "lucide-react";
import { Reveal } from "./Reveal";
import { DRINKS_IMAGE } from "@/config";

export default function Experience() {
  return (
    <section className="intro section-pad" id="experience">
      <Reveal className="section-label">THE VIBE / 01</Reveal>
      <div className="intro-grid">
        <div>
          <Reveal delay={0.05}>
            <h2>
              This is not<br />a <em>function.</em>
            </h2>
          </Reveal>
          <Reveal delay={0.15} className="intro-photo-wrap">
            <div className="intro-photo">
              <img src={DRINKS_IMAGE} alt="Neon cocktails at the bar" />
            </div>
          </Reveal>
        </div>
        <div className="intro-content">
          <Reveal delay={0.1}>
            <p className="big-copy">This is your first iconic night as a DU SOL legend.</p>
          </Reveal>
          <Reveal delay={0.2}>
            <p>Expect a room full of new faces, old friends, heavy bass and the kind of energy that makes Monday feel very far away.</p>
          </Reveal>
          <Reveal delay={0.3} className="feature-row">
            <span><Music2 /> <b>Live DJs</b></span>
            <span><Utensils /> <b>Unlimited food</b></span>
            <span><Sparkles /> <b>Mocktails + bar</b></span>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

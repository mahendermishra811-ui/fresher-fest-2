import { useEffect, useRef, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { getCountdown } from "@/config";

const W = 1080;
const H = 1350;

const drawCard = (canvas) => {
  const ctx = canvas.getContext("2d");
  const { days } = getCountdown();
  ctx.fillStyle = "#0b0c10";
  ctx.fillRect(0, 0, W, H);

  const glow = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(900, 160, 520, "rgba(112,0,255,.55)");
  glow(120, 1200, 560, "rgba(255,51,102,.45)");
  glow(560, 700, 420, "rgba(0,240,255,.18)");

  ctx.strokeStyle = "rgba(255,255,255,.14)";
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, W - 96, H - 96);

  ctx.fillStyle = "#00f0ff";
  ctx.font = "700 26px Unbounded, sans-serif";
  ctx.letterSpacing = "8px";
  ctx.fillText("DU SOL FRESHERS PARTY", 96, 150);

  ctx.fillStyle = "#ffffff";
  ctx.letterSpacing = "-4px";
  ctx.font = "700 150px Unbounded, sans-serif";
  ctx.fillText("SOLSTICE", 90, 330);
  ctx.fillStyle = "#ff3366";
  ctx.fillText("’26", 90, 480);

  ctx.letterSpacing = "0px";
  ctx.fillStyle = "rgba(255,255,255,.14)";
  ctx.fillRect(96, 560, W - 192, 2);

  ctx.fillStyle = "#8d9198";
  ctx.font = "500 26px 'DM Sans', sans-serif";
  ctx.letterSpacing = "6px";
  ctx.fillText("COUNTDOWN", 96, 640);
  ctx.fillStyle = "#ffffff";
  ctx.letterSpacing = "-8px";
  ctx.font = "700 300px Unbounded, sans-serif";
  ctx.fillText(String(days), 84, 900);
  const daysWidth = ctx.measureText(String(days)).width;
  ctx.letterSpacing = "4px";
  ctx.fillStyle = "#00f0ff";
  ctx.font = "700 34px Unbounded, sans-serif";
  ctx.fillText("DAYS TO GO", Math.min(84 + daysWidth + 36, 700), 890);

  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 44px Unbounded, sans-serif";
  ctx.fillText("Sun, 25 October 2026 · 4 PM", 96, 1030);
  ctx.fillStyle = "#c9ccd3";
  ctx.font = "400 32px 'DM Sans', sans-serif";
  ctx.fillText("Punjabi Bagh, New Delhi · DJs · Buffet · Mocktails", 96, 1085);

  ctx.fillStyle = "#ff3366";
  const pillY = 1150;
  ctx.beginPath();
  ctx.roundRect(96, pillY, 560, 84, 42);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 30px 'DM Sans', sans-serif";
  ctx.fillText("Passes from ₹1,299 · Book now", 132, pillY + 54);

  ctx.fillStyle = "#8d9198";
  ctx.font = "500 26px 'DM Sans', sans-serif";
  ctx.fillText(window.location.host, 96, 1270);
};

export default function ShareCard({ onClose }) {
  const canvasRef = useRef(null);
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    const render = () => {
      drawCard(canvasRef.current);
      setDataUrl(canvasRef.current.toDataURL("image/png"));
    };
    if (document.fonts?.load) {
      Promise.all([document.fonts.load("700 150px Unbounded"), document.fonts.load("400 32px 'DM Sans'")]).then(render, render);
    } else {
      render();
    }
  }, []);

  const share = async () => {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], "solstice26-countdown.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Solstice ’26", text: "Freshers party · 25 Oct · Punjabi Bagh. Come with me!" }).catch(() => {});
    } else {
      window.open(dataUrl, "_blank");
    }
  };

  return (
    <div className="modal-backdrop" data-testid="share-card-modal">
      <div className="share-card-modal">
        <button className="close-btn" onClick={onClose} aria-label="Close" data-testid="close-share-card"><X /></button>
        <div className="modal-kicker">BRING YOUR FRIENDS</div>
        <h2>Post the countdown.</h2>
        <p className="payment-hint">Instagram story size (1080 × 1350). Save it, post it, tag your crew.</p>
        <canvas ref={canvasRef} width={W} height={H} hidden />
        {dataUrl ? <img src={dataUrl} alt="Solstice ’26 countdown share card" className="share-preview" data-testid="share-card-preview" /> : <p className="admin-empty">Rendering…</p>}
        <div className="ticket-actions">
          <a href={dataUrl} download="solstice26-countdown.png" className="submit-btn share-btn" data-testid="download-share-card"><Download size={16} /> Download image</a>
          <button className="outline-btn small" onClick={share} disabled={!dataUrl} data-testid="share-share-card"><Share2 size={14} /> Share</button>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import jsQR from "jsqr";
import { ArrowLeft, Camera, Check, Keyboard, X } from "lucide-react";
import { API, startGoogleSignIn } from "@/config";

const tokenFromText = (text) => {
  const match = text.match(/\/pass\/([a-f0-9]{32})/i);
  return match ? match[1] : null;
};

export default function ScanPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [user, setUser] = useState(undefined);
  const [cameraError, setCameraError] = useState("");
  const [result, setResult] = useState(null);
  const [manual, setManual] = useState("");
  const [count, setCount] = useState(0);
  const busyRef = useRef(false);

  useEffect(() => {
    axios.get(`${API}/auth/me`, { withCredentials: true }).then((r) => setUser(r.data)).catch(() => setUser(null));
  }, []);

  const showResult = useCallback((payload) => {
    setResult(payload);
    busyRef.current = true;
    setTimeout(() => { setResult(null); busyRef.current = false; }, payload.ok ? 2600 : 3200);
  }, []);

  const checkIn = useCallback(async (url) => {
    try {
      const { data } = await axios.post(`${API}${url}`, {}, { withCredentials: true });
      setCount((c) => c + 1);
      showResult({ ok: true, title: data.name, sub: `${data.pass_type} · ${data.pass_variant === "couple" ? "admits 2" : "admits 1"} · ${data.booking_id}` });
    } catch (err) {
      showResult({ ok: false, title: "Not admitted", sub: err.response?.data?.detail || "Could not check in" });
    }
  }, [showResult]);

  useEffect(() => {
    if (!user?.is_admin) return undefined;
    let stream;
    let frame;
    const video = videoRef.current;
    const tick = () => {
      if (video?.readyState === video.HAVE_ENOUGH_DATA && !busyRef.current) {
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(video, 0, 0);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
        if (code?.data) {
          const token = tokenFromText(code.data);
          if (token) {
            busyRef.current = true;
            checkIn(`/pass/${token}/checkin`);
          } else {
            showResult({ ok: false, title: "Not a Solstice pass", sub: "This QR isn’t one of ours." });
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        stream = s;
        video.srcObject = s;
        video.setAttribute("playsinline", "true");
        video.play().catch(() => {});
        frame = requestAnimationFrame(tick);
      })
      .catch(() => setCameraError("Camera unavailable. Allow camera access, or type the booking reference below."));
    return () => {
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [user, checkIn, showResult]);

  const submitManual = (e) => {
    e.preventDefault();
    if (!manual.trim()) return;
    checkIn(`/bookings/${encodeURIComponent(manual.trim().toUpperCase())}/checkin`);
    setManual("");
  };

  if (user === undefined) return <div className="scan-shell scan-center" data-testid="scan-loading"><p>Loading scanner…</p></div>;
  if (!user || !user.is_admin) {
    return (
      <div className="scan-shell scan-center" data-testid="scan-denied">
        <div className="confirmation-card">
          <div className="modal-kicker">GATE SCANNER</div>
          <h2>{user ? "Organiser account required." : "Sign in to scan passes."}</h2>
          {!user && <button className="google-btn" onClick={() => startGoogleSignIn("/admin/scan")} data-testid="scan-google-signin-button"><span>G</span> Continue with Google</button>}
          <Link to="/admin" className="text-link close-confirm" data-testid="scan-back-admin">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="scan-shell" data-testid="scan-page">
      <video ref={videoRef} className="scan-video" muted playsInline data-testid="scan-video" />
      <canvas ref={canvasRef} hidden />
      <div className="scan-overlay">
        <header className="scan-head">
          <Link to="/admin" className="scan-back" data-testid="scan-back-link"><ArrowLeft size={18} /> Dashboard</Link>
          <span className="scan-count" data-testid="scan-count"><Camera size={14} /> {count} checked in this session</span>
        </header>
        <div className="scan-frame" aria-hidden="true"><span /><span /><span /><span /></div>
        <p className="scan-hint">Point the camera at a guest’s pass QR</p>
        {cameraError && <div className="form-error scan-error" data-testid="scan-camera-error">{cameraError}</div>}
        <form className="scan-manual" onSubmit={submitManual}>
          <Keyboard size={16} />
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Or type reference, e.g. SOL26-A1B2C3" data-testid="scan-manual-input" />
          <button type="submit" data-testid="scan-manual-submit">Check in</button>
        </form>
      </div>
      {result && (
        <div className={`scan-result ${result.ok ? "ok" : "bad"}`} data-testid={result.ok ? "scan-result-ok" : "scan-result-bad"}>
          {result.ok ? <Check size={64} /> : <X size={64} />}
          <strong>{result.title}</strong>
          <span>{result.sub}</span>
        </div>
      )}
    </div>
  );
}

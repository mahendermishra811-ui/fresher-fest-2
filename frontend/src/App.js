import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Lenis from "lenis";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import "@/App.css";
import { API } from "@/config";
import PartyPage from "@/pages/PartyPage";
import AdminPage from "@/pages/AdminPage";

function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const processed = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const sessionId = new URLSearchParams(location.hash.replace(/^#/, "")).get("session_id");
    if (!sessionId) return;
    axios
      .post(`${API}/auth/session`, { session_id: sessionId }, { withCredentials: true })
      .then(() => {
        const target = sessionStorage.getItem("post_auth_redirect") || "/#booking";
        sessionStorage.removeItem("post_auth_redirect");
        navigate(target, { replace: true });
      })
      .catch(() => setError("Google sign-in could not be completed. Please try again."));
  }, [location.hash, navigate]);
  return (
    <div className="auth-callback" data-testid="auth-callback">
      <div className="modal-kicker">SECURE SIGN-IN</div>
      <h2>{error || "Connecting your Google account…"}</h2>
      {error && (
        <button className="submit-btn" onClick={() => navigate("/", { replace: true })} data-testid="auth-callback-retry">
          Back to booking
        </button>
      )}
    </div>
  );
}

function Routed() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/" element={<PartyPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09 });
    let frame;
    const raf = (time) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    const onClick = (e) => {
      const anchor = e.target.closest?.('a[href^="#"]');
      if (!anchor) return;
      const target = document.querySelector(anchor.getAttribute("href"));
      if (target) {
        e.preventDefault();
        lenis.scrollTo(target, { offset: -80 });
      }
    };
    document.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      document.removeEventListener("click", onClick);
    };
  }, []);
  return (
    <BrowserRouter>
      <Routed />
    </BrowserRouter>
  );
}

export default App;

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const UPI_ID = "dusol2026@oksbi";
export const WHATSAPP_URL =
  "https://wa.me/919999999999?text=Hi%20DU%20SOL%20Freshers%20team%2C%20I%20want%20to%20book%20passes%20for%20October%2025%2C%202026.";

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MDV8MHwxfHNlYXJjaHwxfHxuZW9uJTIwZmVzdGl2YWwlMjBwYXJ0eSUyMGNyb3dkJTIwbGFzZXIlMjBsaWdodHN8ZW58MHx8fHwxNzkwNjc1MjI2fDA&ixlib=rb-4.1.0&q=85";
export const WIDE_IMAGE =
  "https://images.unsplash.com/photo-1545128485-c400e7702796?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MDV8MHwxfHNlYXJjaHwzfHxuZW9uJTIwZmVzdGl2YWwlMjBwYXJ0eSUyMGNyb3dkJTIwbGFzZXIlMjBsaWdodHN8ZW58MHx8fHwxNzkwNjc1MjI2fDA&ixlib=rb-4.1.0&q=85";
export const DRINKS_IMAGE =
  "https://images.unsplash.com/photo-1610515660473-c11d4f3f7d37?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwxfHxjb2NrdGFpbCUyMG1vY2t0YWlsJTIwcGFydHklMjBiYXIlMjBmb29kfGVufDB8fHx8MTc5MDY3NTIyOXww&ixlib=rb-4.1.0&q=85";

export const PASS_TIERS = [
  {
    id: "silver", number: "01", name: "Early Bird Passes",
    window: "Active now · closes 5 October",
    start: "2026-01-01T00:00:00", end: "2026-10-05T23:59:59",
    tagline: "The best price for the quickest ones",
    single: 1299, couple: 2199,
    perks: ["Party entry", "Unlimited buffet", "Mocktail welcome drink"],
    tone: "silver",
  },
  {
    id: "gold", number: "02", name: "Not Late Passes",
    window: "6 October – 20 October",
    start: "2026-10-06T00:00:00", end: "2026-10-20T23:59:59",
    tagline: "Still early enough to lock it in",
    single: 1499, couple: 2599,
    perks: ["Priority entry", "Unlimited buffet + mocktails", "Dance floor fast lane"],
    tone: "gold", popular: true,
  },
  {
    id: "diamond", number: "03", name: "Last Minute Arrivals",
    window: "21 October – 25 October · Diamond VIP",
    start: "2026-10-21T00:00:00", end: "2026-10-25T23:59:59",
    tagline: "For the ones who make an entrance",
    single: 1999, couple: 2999,
    perks: ["VIP lounge access", "Premium bar counters", "Front stage viewing"],
    tone: "diamond",
  },
];

export const tierState = (tier) => {
  const now = new Date();
  if (now > new Date(tier.end)) return "closed";
  if (now < new Date(tier.start)) return "upcoming";
  return "live";
};

export const getCountdown = () => {
  const difference = Math.max(0, new Date("2026-10-25T16:00:00") - new Date());
  return {
    days: Math.floor(difference / 86400000),
    hours: Math.floor((difference / 3600000) % 24),
    minutes: Math.floor((difference / 60000) % 60),
  };
};

export const startGoogleSignIn = (returnTo) => {
  sessionStorage.setItem("post_auth_redirect", returnTo);
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const redirectUrl = window.location.origin + "/";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
};

export const Logo = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" data-testid="brand-logo">
    <rect x="8" y="8" width="32" height="32" rx="9" transform="rotate(-8 24 24)" fill="#ff3366" />
    <path
      d="M24 12.5l3.1 6.9 7.6 1.1-5.5 5.4 1.3 7.6L24 30.3l-6.8 3.6 1.3-7.6-5.5-5.4 7.6-1.1L24 12.5z"
      fill="#0b0c10"
    />
  </svg>
);

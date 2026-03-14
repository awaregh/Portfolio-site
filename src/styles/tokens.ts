// Cinnamoroll-inspired: soft sky blue + pastel pink + cloud white
export const tokens = {
  colors: {
    bg: "#f0f7ff",           // very light sky — main background
    surface: "#ffffff",       // pure white — card surfaces
    surfaceDim: "#e4f2fc",   // slightly dimmed surface
    sky: "#cce8f9",           // sky blue tint band
    cloud: "#f8fbff",         // cloud white
    text: "#1a2f45",          // deep navy — primary text
    subtext: "#57789a",       // muted blue-gray — secondary text
    accent: "#3d9bd4",        // sky blue — primary CTA
    accentHover: "#2880b5",   // deeper sky hover
    pink: "#e8a3be",          // pastel pink — secondary accent
    pinkLight: "#fce8f2",     // light pink surface
    border: "rgba(61,155,212,0.16)",
    borderStrong: "rgba(61,155,212,0.26)",
  },
  fontFamily: {
    sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'IBM Plex Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
  fontSize: {
    xs: "12px",
    sm: "14px",
    base: "16px",
    lg: "20px",
    xl: "28px",
    "2xl": "38px",
  },
} as const;

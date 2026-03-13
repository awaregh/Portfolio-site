import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#eef6fd",
        foreground: "#1a2e4a",
        card: "#ffffff",
        "card-alt": "#f4f9ff",
        border: "rgba(147,197,253,0.3)",
        muted: "#6b7ea3",
        accent: "#5b9bd5",
        "accent-pink": "#f9a8d4",
        "sky-soft": "#e8f4fd",
        "cloud-white": "#f8fbff",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
      },
      backgroundImage: {
        "sky-gradient": "linear-gradient(160deg, #dbeafe 0%, #ede9fe 45%, #fce7f3 100%)",
        "card-glow": "linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)",
      },
      boxShadow: {
        "soft": "0 2px 16px rgba(147,197,253,0.18), 0 1px 4px rgba(147,197,253,0.12)",
        "soft-lg": "0 8px 32px rgba(147,197,253,0.22), 0 2px 8px rgba(147,197,253,0.15)",
        "pink-glow": "0 4px 20px rgba(249,168,212,0.25)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;

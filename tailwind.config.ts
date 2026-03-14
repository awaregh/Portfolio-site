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
        bg: "#f0f7ff",
        surface: "#ffffff",
        "surface-dim": "#e4f2fc",
        sky: "#cce8f9",
        cloud: "#f8fbff",
        text: "#1a2f45",
        subtext: "#57789a",
        accent: "#3d9bd4",
        "accent-hover": "#2880b5",
        pink: "#e8a3be",
        "pink-light": "#fce8f2",
        border: "rgba(61,155,212,0.16)",
        "border-strong": "rgba(61,155,212,0.26)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["IBM Plex Mono", "Fira Code", "Cascadia Code", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(61,155,212,0.08), 0 0 0 1px rgba(61,155,212,0.12)",
        "card-hover": "0 4px 16px rgba(61,155,212,0.14), 0 0 0 1px rgba(61,155,212,0.22)",
        sky: "0 4px 20px rgba(61,155,212,0.18)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      keyframes: {
        "cloud-float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "cloud-float": "cloud-float 6s ease-in-out infinite",
        "cloud-float-slow": "cloud-float 9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

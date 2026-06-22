import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Verdikt design system color palette
      colors: {
        // Base surfaces
        ink: "#0B0E11",        // near-black background
        paper: "#F7F5F0",      // warm paper-white card surface
        "paper-dim": "#EDE9E2", // slightly darker paper for nested surfaces

        // Verdict colors — reserved exclusively for their semantic meaning
        invest: {
          DEFAULT: "#1A5F3F",   // deep green — INVEST verdict only
          light: "#22794F",     // hover / active state
          muted: "#1A5F3F26",   // background tint
        },
        pass: {
          DEFAULT: "#8B2635",   // oxblood red — PASS verdict only
          light: "#A32D3F",     // hover / active state
          muted: "#8B263526",   // background tint
        },

        // Accent
        brass: {
          DEFAULT: "#C9A227",   // confidence scores, emphasis, active UI states
          muted: "#C9A22726",   // background tint
          dark: "#A88420",      // darker for text on light backgrounds
        },

        // Secondary text
        slate: {
          DEFAULT: "#5B6470",   // secondary labels, timestamps, metadata
          light: "#8A939E",     // tertiary / disabled text
        },

        // Node state colors
        "node-pending": "#2A2E35",
        "node-active": "#1E2530",
        "node-complete": "#141A1F",
      },

      // Typography — three distinct roles
      fontFamily: {
        // Editorial serif: company names, verdict text, headings
        // Applied via class: font-editorial
        editorial: ["Playfair Display", "Georgia", "serif"],
        // Monospace: all numbers, tickers, financial figures
        // Applied via class: font-mono
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
        // Grotesque sans: UI chrome, labels, body text
        // Applied via class: font-sans (the default)
        sans: ["Inter", "system-ui", "sans-serif"],
      },

      // Spacing extensions for the research feed
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },

      // Border radius for stamp aesthetic
      borderRadius: {
        stamp: "2px",
      },

      // Animation — kept minimal, respects prefers-reduced-motion in globals.css
      keyframes: {
        "slide-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "stamp-drop": {
          "0%": { opacity: "0", transform: "rotate(-6deg) scale(1.15)" },
          "60%": { opacity: "1", transform: "rotate(-6deg) scale(0.97)" },
          "100%": { opacity: "1", transform: "rotate(-6deg) scale(1)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-15px)" },
        },
      },
      animation: {
        "slide-in": "slide-in 0.3s ease-out forwards",
        "fade-in": "fade-in 0.4s ease-out forwards",
        "stamp-drop": "stamp-drop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        pulse: "pulse 1.5s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },

      // Box shadow — used for card elevation and stamp effect
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)",
        "card-hover": "0 4px 12px 0 rgba(0,0,0,0.5)",
        stamp: "inset 0 0 0 3px currentColor",
      },
    },
  },
  plugins: [],
};

export default config;

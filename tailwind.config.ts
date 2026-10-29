import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#0B0D0C",
        surface: "#121514",
        charcoal: "#181C1A",
        raised: "#1F2422",
        "dark-red": "#1A0E0F",
        crimson: {
          DEFAULT: "#E63946",
          accent: "#FF4D5A",
          deep: "#9E1F29",
          muted: "#3A171B",
        },
        gold: "#D6B56D",
        forest: "#557A5C",
        moss: "#88A47C",
        border: {
          DEFAULT: "#262C29",
          subtle: "#1D2220",
          crimson: "#4A1E23",
        },
        ink: {
          primary: "#F5F5F5",
          warm: "#F2F0E8",
          secondary: "#C9C9C9",
          muted: "#7D8580",
          dim: "#565E59",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        crimson: "0 0 28px -4px rgba(230, 57, 70, 0.45)",
        "crimson-sm": "0 0 16px -3px rgba(230, 57, 70, 0.35)",
        panel: "0 20px 50px -12px rgba(0, 0, 0, 0.75)",
        inner: "inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
      },
      backgroundImage: {
        "crimson-glow":
          "radial-gradient(circle at 50% 0%, rgba(230, 57, 70, 0.16), transparent 65%)",
      },
    },
  },
  plugins: [],
};

export default config;


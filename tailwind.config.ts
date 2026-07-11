import type { Config } from "tailwindcss";

// Ivory ledger design system — see §2 of the build spec.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F5F1E8",
        panel: "#FBF9F3",
        ink: "#2A2418",
        muted: "#7A7260",
        faint: "#A39B87",
        rule: "#CBB97F",
        gold: "#C9A84C",
        wash: "#EFE9DA",
        success: "#5B6E3A",
        danger: "#8C3B2E",
        warning: "#A9762B",
        info: "#5C6B7A",
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-dmsans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;

import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#444847",
        panelSoft: "#565b59",
        night: "#262c2d",
        line: "#aeb5b0"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(230,238,232,0.55), 0 18px 42px rgba(0,0,0,0.28)"
      }
    }
  },
  plugins: []
} satisfies Config;


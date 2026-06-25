/// <reference types="vitest" />

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: "0.0.0.0",
    // Proxy API calls to the backend so the browser sees the frontend and API
    // on the SAME origin. This keeps the auth/CSRF/session cookies first-party
    // (cross-origin cookies are blocked by modern browsers). Mirrors the
    // production nginx gateway which also proxies /api to the API service.
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8000",
        changeOrigin: true
      }
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/unit/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"]
  }
});

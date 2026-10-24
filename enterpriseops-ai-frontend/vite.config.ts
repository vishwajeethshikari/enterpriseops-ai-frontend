
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/health": "http://localhost:8001",
      "/investigate": "http://localhost:8001",
      "/ai": "http://localhost:8001",
      "/spring-api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/spring-api/, ""),
      },
    },
  },
});

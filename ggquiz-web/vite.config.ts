import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Pixabay không cho gọi trực tiếp từ browser (CORS) → proxy qua Vite
      "/pixabay-api": {
        target: "https://pixabay.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pixabay-api/, "/api"),
        secure: true,
      },
    },
  },
});

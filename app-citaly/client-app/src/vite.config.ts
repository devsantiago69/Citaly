import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      // Alias actualizados para la estructura actual
      "components": path.resolve(__dirname, "./components"),
      "contexts": path.resolve(__dirname, "./contexts"),
      "hooks": path.resolve(__dirname, "./hooks"),
      "lib": path.resolve(__dirname, "./lib"),
      "pages": path.resolve(__dirname, "./pages"),
    },
  },
  root: './', // Define la raíz del proyecto como la ubicación actual
}));
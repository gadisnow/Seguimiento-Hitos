import { defineConfig } from "vite";

// App vanilla (sin framework). Vite toma index.html de la raiz como entrada
// y empaqueta /src/main.js y styles.css referenciados desde el HTML.
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    port: 5173,
    open: true
  }
});

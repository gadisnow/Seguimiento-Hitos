import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf8")
);

// App vanilla (sin framework). Vite toma index.html de la raiz como entrada
// y empaqueta /src/main.js y styles.css referenciados desde el HTML.
export default defineConfig({
  // __APP_VERSION__ queda "horneado" en el bundle con el valor que tenga
  // package.json AL MOMENTO DEL BUILD. Ese numero solo cambia cuando el
  // workflow de bump-version.yml lo commitea a main (ver ese archivo) —
  // builds de test/preview usan lo que ya este commiteado en la rama, sin
  // moverlo por su cuenta.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
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

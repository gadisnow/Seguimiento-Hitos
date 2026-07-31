// Cliente Supabase compartido. Solo usa la anon key (publica por diseno);
// la seguridad real vive en las politicas RLS del backend.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Falla temprano y visible si faltan las variables de entorno.
  const msg =
    "Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
    "Copia .env.example a .env (local) o configuralas en Vercel.";
  console.error(msg);
  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.innerHTML =
        `<pre style="padding:24px;font:14px/1.5 monospace;color:#b91c1c">${msg}</pre>`;
    });
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

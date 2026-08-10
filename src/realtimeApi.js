// Suscripcion a cambios en vivo (Supabase Realtime / Postgres Changes) de
// la pizarra abierta -- dominio propio, mismo patron que authApi.js/
// dataApi.js/pizarraApi.js. Ver supabase/migrations/024_realtime_publication.sql
// para las tablas habilitadas y el wiring completo (debounce, defer
// mientras hay un modal abierto) en app.js.
import { supabase } from "./supabaseClient.js";

// Tablas scopeadas por pizarra_id que ya trae fetchInitialState
// (src/dataApi.js) -- cualquier cambio en cualquiera de estas dispara el
// callback; no se filtra por tipo de evento porque el caller siempre
// termina haciendo un refetch completo del board, no un merge fila a fila.
const TABLAS_PIZARRA = [
  "pizarras", "columnas", "temas", "hitos", "expedientes",
  "responsables", "comentarios", "activity_log", "documentos", "etiquetas"
];

// Crea y suscribe un canal a todos los cambios de esa pizarra. Devuelve el
// canal (guardarlo para poder desuscribirlo despues con unsubscribeBoard).
export function subscribeToBoard(pizarraId, onChange) {
  let channel = supabase.channel(`board-${pizarraId}`);
  for (const tabla of TABLAS_PIZARRA) {
    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: tabla, filter: `pizarra_id=eq.${pizarraId}` },
      onChange
    );
  }
  channel.subscribe();
  return channel;
}

export function unsubscribeBoard(channel) {
  if (channel) supabase.removeChannel(channel);
}

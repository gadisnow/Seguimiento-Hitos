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

// pizarras es la unica tabla de la lista que no tiene una columna
// pizarra_id propia -- la fila DE la pizarra se identifica por su "id". Con
// el filtro generico (pizarra_id=eq.X) esta suscripcion nunca matcheaba
// nada, asi que cambios directos sobre la pizarra (renombrar, cambiar
// color/accesorios) no llegaban en vivo.
function filtroPizarra(tabla, pizarraId) {
  return tabla === "pizarras" ? `id=eq.${pizarraId}` : `pizarra_id=eq.${pizarraId}`;
}

// Crea y suscribe un canal a todos los cambios de esa pizarra. Devuelve el
// canal (guardarlo para poder desuscribirlo despues con unsubscribeBoard).
// onStatusChange (opcional) recibe el status de cada intento de conexion
// ("SUBSCRIBED"/"CHANNEL_ERROR"/"TIMED_OUT"/"CLOSED") -- sin esto el caller
// no se entera si la suscripcion nunca prendio o se cayo a mitad de sesion
// (el canal queda mudo en silencio, sin reintentar).
export function subscribeToBoard(pizarraId, onChange, onStatusChange) {
  let channel = supabase.channel(`board-${pizarraId}`);
  for (const tabla of TABLAS_PIZARRA) {
    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: tabla, filter: filtroPizarra(tabla, pizarraId) },
      onChange
    );
  }
  channel.subscribe((status, err) => {
    if (status !== "SUBSCRIBED" && err) console.error("Realtime board channel error:", status, err);
    onStatusChange?.(status);
  });
  return channel;
}

export function unsubscribeBoard(channel) {
  if (channel) supabase.removeChannel(channel);
}

// =========================================================
// Presence: quien esta conectado a la app en este momento (no scopeado por
// pizarra -- un solo canal global por sesion). Cada cliente hace track() de
// si mismo con su ultima actividad local; el resto recibe el estado
// agregado via el evento "sync" y calcula el color (activo/inactivo/
// desconectado) en base a ese timestamp. Ver wiring completo (heartbeat,
// listeners de actividad) en app.js.
// =========================================================
const PRESENCE_CHANNEL_NAME = "presence-app";

// key: profile.id -- asi el presenceState() del canal llega ya agrupado por
// usuario (un usuario con 2 pestañas abiertas aparece una vez con 2 metas).
export function subscribeToPresence(profile, onSync) {
  const channel = supabase.channel(PRESENCE_CHANNEL_NAME, {
    config: { presence: { key: profile.id } }
  });
  channel.on("presence", { event: "sync" }, () => onSync(channel.presenceState()));
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      channel.track({ nombre: profile.nombre, last_activity: Date.now() });
    }
  });
  return channel;
}

export function trackPresence(channel, data) {
  if (channel) channel.track(data);
}

export function unsubscribePresence(channel) {
  if (channel) supabase.removeChannel(channel);
}

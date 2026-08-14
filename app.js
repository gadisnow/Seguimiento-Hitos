import * as authApi from "./src/authApi.js";
import * as dataApi from "./src/dataApi.js";
import * as pizarraApi from "./src/pizarraApi.js";
import * as realtimeApi from "./src/realtimeApi.js";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import DOMPurify from "dompurify";

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return String(h >>> 0);
}

const STATES = ["Pendiente", "En curso", "En revision", "Bloqueado", "Cerrado"];
const STATE_COLORS = {
  "Pendiente": "#ef4444",
  "En curso": "#3b82f6",
  "Bloqueado": "#f59e0b",
  "Cerrado": "#10b981",
  "En revision": "#8b5cf6"
};

const RESP_PALETTE = ["#4f46e5","#3b82f6","#06b6d4","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#84cc16","#f97316"];

// Paleta de 24 colores para etiquetas (estilo Google Calendar): nombre + hex
// de fondo/texto por modo claro y oscuro. Los pares bg/text superan contraste AA.
const TAG_COLORS = [
  { name: "Magenta",           light: { bg: "#AD1457", text: "#FFFFFF" }, dark: { bg: "#560A2B", text: "#FFFFFF" } },
  { name: "Rosa fuerte",       light: { bg: "#D81B60", text: "#FFFFFF" }, dark: { bg: "#6C0D30", text: "#FFFFFF" } },
  { name: "Salmón",            light: { bg: "#E67C73", text: "#FFFFFF" }, dark: { bg: "#733E39", text: "#FFFFFF" } },
  { name: "Rojo",              light: { bg: "#D50000", text: "#FFFFFF" }, dark: { bg: "#6A0000", text: "#FFFFFF" } },
  { name: "Naranja rojizo",    light: { bg: "#F4511E", text: "#FFFFFF" }, dark: { bg: "#7A280F", text: "#FFFFFF" } },
  { name: "Naranja",           light: { bg: "#EF6C00", text: "#FFFFFF" }, dark: { bg: "#773600", text: "#FFFFFF" } },
  { name: "Ámbar naranja",     light: { bg: "#F09300", text: "#FFFFFF" }, dark: { bg: "#784900", text: "#FFFFFF" } },
  { name: "Ámbar",             light: { bg: "#F6BF26", text: "#FFFFFF" }, dark: { bg: "#7B5F13", text: "#FFFFFF" } },
  { name: "Amarillo verdoso",  light: { bg: "#E4C441", text: "#FFFFFF" }, dark: { bg: "#726220", text: "#FFFFFF" } },
  { name: "Lima",              light: { bg: "#C0CA33", text: "#FFFFFF" }, dark: { bg: "#606519", text: "#FFFFFF" } },
  { name: "Verde claro",       light: { bg: "#7CB342", text: "#FFFFFF" }, dark: { bg: "#3E5921", text: "#FFFFFF" } },
  { name: "Verde",             light: { bg: "#0B8043", text: "#FFFFFF" }, dark: { bg: "#054021", text: "#FFFFFF" } },
  { name: "Verde esmeralda",   light: { bg: "#33B679", text: "#FFFFFF" }, dark: { bg: "#195B3C", text: "#FFFFFF" } },
  { name: "Verde azulado",     light: { bg: "#009688", text: "#FFFFFF" }, dark: { bg: "#004B44", text: "#FFFFFF" } },
  { name: "Celeste",           light: { bg: "#039BE5", text: "#FFFFFF" }, dark: { bg: "#014D72", text: "#FFFFFF" } },
  { name: "Azul",              light: { bg: "#4285F4", text: "#FFFFFF" }, dark: { bg: "#21427A", text: "#FFFFFF" } },
  { name: "Azul violáceo",     light: { bg: "#7986CB", text: "#FFFFFF" }, dark: { bg: "#3C4365", text: "#FFFFFF" } },
  { name: "Índigo",            light: { bg: "#3F51B5", text: "#FFFFFF" }, dark: { bg: "#1F285A", text: "#FFFFFF" } },
  { name: "Lavanda",           light: { bg: "#B39DDB", text: "#FFFFFF" }, dark: { bg: "#594E6D", text: "#FFFFFF" } },
  { name: "Púrpura mauve",     light: { bg: "#9E69AF", text: "#FFFFFF" }, dark: { bg: "#4F3457", text: "#FFFFFF" } },
  { name: "Púrpura",           light: { bg: "#8E24AA", text: "#FFFFFF" }, dark: { bg: "#471255", text: "#FFFFFF" } },
  { name: "Marrón",            light: { bg: "#795548", text: "#FFFFFF" }, dark: { bg: "#3C2A24", text: "#FFFFFF" } },
  { name: "Gris",              light: { bg: "#616161", text: "#FFFFFF" }, dark: { bg: "#303030", text: "#FFFFFF" } },
  { name: "Beige",             light: { bg: "#A79A8E", text: "#FFFFFF" }, dark: { bg: "#534D47", text: "#FFFFFF" } }
];

// La paleta original tenia 6 hex fijos guardados en Supabase; se mapean a su
// equivalente mas cercano de la paleta nueva para que sigan mostrandose bien.
const LEGACY_TAG_COLOR_MAP = {
  "#bbf7d0": "Verde", "#fef08a": "Ámbar", "#fed7aa": "Naranja",
  "#fecaca": "Rojo", "#e9d5ff": "Púrpura", "#bfdbfe": "Azul"
};

function isDarkTheme() {
  return document.documentElement.dataset.theme === "dark";
}

// Resuelve un color de etiqueta (nombre de TAG_COLORS, o hex legado) al par
// bg/text del modo claro u oscuro activo.
function resolveTagColor(nameOrLegacyHex) {
  const name = LEGACY_TAG_COLOR_MAP[nameOrLegacyHex] || nameOrLegacyHex;
  const entry = TAG_COLORS.find((c) => c.name === name) || TAG_COLORS[0];
  const set = isDarkTheme() ? entry.dark : entry.light;
  return { name: entry.name, bg: set.bg, text: set.text };
}

// Menu de seleccion de color reutilizable (menu "Etiquetas" y popover del
// formulario de tema): circulos solidos sin texto, estilo Google Calendar.
// Un solo color seleccionado a la vez — es para elegir el color de UNA etiqueta.
function tagColorGridHtml(selectedName) {
  return `<div class="tagcolor-grid" role="group" aria-label="Seleccionar color">
    ${TAG_COLORS.map((c) => {
      const set = isDarkTheme() ? c.dark : c.light;
      const isSel = c.name === selectedName;
      return `<button type="button" class="tagcolor-circle${isSel ? " selected" : ""}" data-tag-color="${c.name}"
        style="background:${set.bg}" aria-pressed="${isSel}" aria-label="${escHtml(c.name)}" title="${escHtml(c.name)}">
        ${isSel ? `<span class="tagcolor-check" aria-hidden="true" style="color:${set.text}">${icon("check", 12)}</span>` : ""}
      </button>`;
    }).join("")}
  </div>`;
}

function etiquetaChipHtml(et, opts = {}) {
  const { bg, text } = resolveTagColor(et.color);
  return `<span class="etiqueta-chip${opts.compact ? " compact" : ""}" style="background:${bg};color:${text}" title="${escHtml(et.nombre)}">
    ${opts.compact ? "" : escHtml(et.nombre)}
    ${opts.removable ? `<button type="button" class="etiqueta-chip-remove" data-etiqueta-remove="${opts.index}" aria-label="Quitar etiqueta">${icon("cerrar", 12)}</button>` : ""}
  </span>`;
}

// Preferencia visual: mostrar u ocultar el texto de las etiquetas en las tarjetas del Kanban.
let etiquetasExpandidas = localStorage.getItem("sgtemas_labels_expanded") === "1";

function toggleEtiquetasExpandidas() {
  etiquetasExpandidas = !etiquetasExpandidas;
  localStorage.setItem("sgtemas_labels_expanded", etiquetasExpandidas ? "1" : "0");
  renderAgenda();
}

// Etiquetas ya usadas en algun tema, para sugerir/reusar en vez de recrear con otro color.
function getEtiquetasRegistro() {
  const map = new Map();
  (state.etiquetas || []).forEach((e) => { if (e.nombre) map.set(e.nombre.toLowerCase(), { nombre: e.nombre, color: e.color }); });
  state.temas.forEach((t) => (t.etiquetas || []).forEach((et) => {
    if (et && et.nombre && !map.has(et.nombre.toLowerCase())) map.set(et.nombre.toLowerCase(), { nombre: et.nombre, color: et.color });
  }));
  return [...map.values()];
}

const tableSortState = {
  tableHitos:       { key: "fechaLimite", dir: 1 },
  tableExpedientes: { key: "numero", dir: 1 },
  tableAlertas:     { key: "nivel", dir: -1 }
};

const tableSortGetters = {
  tableHitos: {
    id: (x) => x.id || "",
    nombre: (x) => x.nombre || "",
    tema: (x) => x.temaNombre || "",
    responsable: (x) => x.responsable || "",
    estado: (x) => x.estado || "",
    fechaInicio: (x) => x.fechaInicio || "",
    fechaLimite: (x) => x.fechaLimite || ""
  },
  tableExpedientes: {
    numero: (x) => x.numero || "",
    gde: (x) => x.gde || "",
    temaAsociado: (x) => x.temaAsociado || "",
    responsable: (x) => x.responsable || "",
    fechaInicio: (x) => x.fechaInicio || "",
    fechaLimite: (x) => x.fechaLimite || "",
    estado: (x) => x.estado || ""
  },
  tableAlertas: {
    nivel: (x) => x.nivel || 0,
    tema: (x) => x.tema || "",
    responsable: (x) => x.responsable || "",
    expediente: (x) => x.expediente || "",
    fechaLimite: (x) => x.fechaLimite || ""
  }
};

function sortTableData(items, tableId) {
  const config = tableSortState[tableId];
  const getters = tableSortGetters[tableId];
  if (!config || !getters || !config.key || !getters[config.key]) return Array.isArray(items) ? [...items] : items;
  return [...items].sort((a, b) => {
    const va = getters[config.key](a);
    const vb = getters[config.key](b);
    return String(va).localeCompare(String(vb), "es", { numeric: true, sensitivity: "base" }) * config.dir;
  });
}

function setTableSort(tableId, key) {
  const st = tableSortState[tableId] || { key: null, dir: 1 };
  if (st.key === key) st.dir = -st.dir; else { st.key = key; st.dir = 1; }
  tableSortState[tableId] = st;
  renderAll();
}

function updateSortHeaders() {
  document.querySelectorAll(".data-table th.sortable").forEach((th) => {
    th.classList.remove("sorted-asc", "sorted-desc");
    const cfg = tableSortState[th.dataset.sortTable];
    if (cfg && cfg.key === th.dataset.sortKey) th.classList.add(cfg.dir === 1 ? "sorted-asc" : "sorted-desc");
  });
}

// seedData eliminado: la fuente de verdad ahora es Supabase.

// =========================================================
// State helpers
// =========================================================
function escHtml(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}


// Estado en memoria para renderizar. La fuente de verdad es Supabase.
function defaultReportFilters() {
  return {
    dateField: "fechaLimite",
    dateFrom: "", dateTo: "",
    estados: [], prioridades: [], responsables: [], dependencias: [], etiquetas: [],
    expediente: "",
    soloVencidos: false, incluirPrivados: false, soloConExpediente: false,
    secciones: { resumen: true, temas: true, hitos: true, expedientes: false, actividad: false }
  };
}

let state = {
  config: { currentUser: "", areaDefault: "SSOyS", rol: "Viewer" },
  temas: [], expedientes: [], responsables: [], documentos: [], usuarios: [], etiquetas: [],
  columnas: [], currentPizarraId: null, pizarraActual: null,
  profile: null,
  reportFilters: defaultReportFilters()
};

// Borrador editable del panel "Personalizar reporte" — separado de state.reportFilters
// para que Cancelar descarte cambios sin tocar el reporte vigente.
let reportFiltersDraft = defaultReportFilters();

// Datos principales NO se guardan en localStorage (viven en Supabase).
function saveState() { /* no-op: persistimos via dataApi */ }

const charts = {};

function getDark() { return document.documentElement.dataset.theme === "dark"; }

// =========================================================
// Session & permissions
// =========================================================
function getSessionUser() { return state.profile; }

function getCurrentRol() { return state.profile ? state.profile.rol : "Viewer"; }

function puedeEditar() { const r = getCurrentRol(); return r === "Admin" || r === "Editor"; }
function puedeEliminar() { return getCurrentRol() === "Admin"; }
function esAdmin() { return getCurrentRol() === "Admin"; }
// Creador de la pizarra ACTUALMENTE cargada (no el rol global Admin): unico
// que puede marcar temas privados, invitar colaboradores o habilitar
// accesorios (ver spec fase 3/4).
function esCreadorPizarra() { return Boolean(state.pizarraActual && state.pizarraActual.creadorId === activeUserId()); }
function activeUserName() { return state.profile ? state.profile.nombre : state.config.currentUser; }
function activeUserId() { return state.profile ? state.profile.id : null; }

// --------- Persistencia / recarga desde Supabase ---------
// pizarraId: si se pasa, cambia de tablero (selector de pizarras); si se
// omite, refresca el tablero actualmente cargado. fetchInitialState(null)
// por su cuenta resuelve al PRIMER tablero (comportamiento fase 1, sin
// selector) — hay que pasarle explicitamente state.currentPizarraId o todo
// reloadState() sin argumento (guardar un tema, un hito, etc.) te saca del
// tablero 2+ de vuelta al primero.
async function reloadState(pizarraId) {
  const data = await dataApi.fetchInitialState(pizarraId || state.currentPizarraId);
  state.temas = data.temas;
  state.expedientes = data.expedientes;
  state.responsables = data.responsables;
  state.documentos = data.documentos;
  state.usuarios = data.usuarios;
  state.etiquetas = data.etiquetas;
  state.columnas = data.columnas;
  state.currentPizarraId = data.pizarraId;
  state.pizarraActual = data.pizarra;
  renderAll();
  ensureBoardRealtimeSubscription(data.pizarraId);
  refreshBoardMembers(data.pizarraId);
}

// =========================================================
// Realtime: ver cambios de otros colaboradores sin esperar una accion
// propia ni un F5 (ver src/realtimeApi.js y supabase/migrations/024).
// Cualquier cambio en la pizarra abierta dispara un refetch completo
// (reusa reloadState/renderAll tal cual, sin merge fila a fila) -- pero
// SOLO si no hay un modal abierto: openTemaForm deja "draft" como
// referencia viva a un objeto de state.temas, y un reloadState a mitad de
// una edicion lo dejaria huerfano (el Submit final pisaria con datos
// viejos cualquier cambio ajeno llegado en el medio). Con un modal
// abierto, el refresh se difiere hasta que el usuario lo cierra.
// =========================================================
let boardChannel = null;
let boardChannelPizarraId = null;
let pendingRemoteRefresh = false;
let remoteChangeTimer = null;
let boardResubscribeTimer = null;

// force=true reabre la suscripcion aunque ya este "puesta" para esa misma
// pizarraId -- lo usan el reintento de abajo (onBoardChannelStatus) y el
// refresh al volver a la pestana (ver bindEvents/visibilitychange), que
// necesitan poder recrear un canal que quedo colgado sin que cambie el id.
function ensureBoardRealtimeSubscription(pizarraId, force = false) {
  if (!force && pizarraId === boardChannelPizarraId) return;
  realtimeApi.unsubscribeBoard(boardChannel);
  clearTimeout(boardResubscribeTimer);
  boardChannel = pizarraId
    ? realtimeApi.subscribeToBoard(pizarraId, onRemoteBoardChange, (status) => onBoardChannelStatus(pizarraId, status))
    : null;
  boardChannelPizarraId = pizarraId || null;
}

// El socket de Realtime se puede caer en silencio (wifi, laptop en suspenso,
// token vencido) sin que la app se entere -- antes no habia forma de
// recuperarse salvo un F5 manual, que era justo el sintoma reportado
// ("los cambios de otro usuario no se ven en vivo"). Con el status callback
// de subscribeToBoard, un CHANNEL_ERROR/TIMED_OUT/CLOSED dispara un
// reintento a los 3s (solo si seguimos en esa misma pizarra).
function onBoardChannelStatus(pizarraId, status) {
  if (status !== "CHANNEL_ERROR" && status !== "TIMED_OUT" && status !== "CLOSED") return;
  if (pizarraId !== boardChannelPizarraId) return;
  clearTimeout(boardResubscribeTimer);
  boardResubscribeTimer = setTimeout(() => ensureBoardRealtimeSubscription(pizarraId, true), 3000);
}

function teardownBoardRealtimeSubscription() {
  clearTimeout(boardResubscribeTimer);
  realtimeApi.unsubscribeBoard(boardChannel);
  boardChannel = null;
  boardChannelPizarraId = null;
  pendingRemoteRefresh = false;
}

// Debounced: varios cambios seguidos (ej. reordenar 5 columnas) disparan
// un solo refetch, no uno por evento.
function onRemoteBoardChange() {
  clearTimeout(remoteChangeTimer);
  remoteChangeTimer = setTimeout(() => {
    const modalAbierto = Boolean((els.modalTask && els.modalTask.open) || (els.modalForm && els.modalForm.open));
    if (modalAbierto) {
      if (!pendingRemoteRefresh) showToast("Hay cambios nuevos de otro usuario. Se van a mostrar cuando cierres esta ventana.");
      pendingRemoteRefresh = true;
      return;
    }
    reloadState(state.currentPizarraId);
  }, 500);
}

// =========================================================
// Presence: quien esta conectado ahora mismo (ver src/realtimeApi.js).
// Cada cliente manda un heartbeat con su ultima actividad local (mouse/
// teclado/scroll); el resto calcula el color a partir de ese timestamp:
// <=15min activo (verde), <=60min inactivo (amarillo), >60min o sin datos
// de presencia = desconectado (rojo). Usado en la vista Usuarios (punto de
// estado) y en el stack de avatares junto al boton Colaboradores (filtrado
// a los miembros de la pizarra actual).
// =========================================================
const PRESENCE_HEARTBEAT_MS = 30000;
// Mismo umbral que presenceStatus() usa para marcar a alguien "desconectado"
// (rojo) a los demas -- si vos mismo llevas 60min sin mover el mouse/teclado,
// tiene sentido que tu propia sesion se cierre, no solo que se vea roja.
const IDLE_LOGOUT_MS = 60 * 60 * 1000;
// lastLocalActivity es una variable en memoria: si se cierra el navegador o
// el SO descarta la pestana (laptop suspendida, tab discarded), se pierde y
// un boot() nuevo la reinicia en "ahora", sin recordar que en realidad hacia
// horas que no habia actividad -- la sesion de Supabase (que dura mucho mas
// que 60min) quedaba entrando directo sin pasar por el chequeo de inactividad.
// Se persiste en localStorage para que boot() pueda reconstruir cuanto
// tiempo real paso antes de confiar en una sesion existente.
const LAST_ACTIVITY_LS_KEY = "sgtemas_last_activity";
let presenceChannel = null;
let presenceHeartbeatTimer = null;
let idleLogoutTimer = null;
let presenceLastActivity = {}; // userId -> timestamp ms de su ultima actividad conocida
let lastLocalActivity = Date.now();
let boardMembers = []; // creador + colaboradores aceptados de la pizarra actual (id/nombre/email)

function startPresence() {
  if (!state.profile || presenceChannel) return;
  presenceChannel = realtimeApi.subscribeToPresence(state.profile, onPresenceSync);
  presenceHeartbeatTimer = setInterval(sendPresenceHeartbeat, PRESENCE_HEARTBEAT_MS);
  idleLogoutTimer = setInterval(checkIdleLogout, PRESENCE_HEARTBEAT_MS);
}

function stopPresence() {
  clearInterval(presenceHeartbeatTimer);
  presenceHeartbeatTimer = null;
  clearInterval(idleLogoutTimer);
  idleLogoutTimer = null;
  realtimeApi.unsubscribePresence(presenceChannel);
  presenceChannel = null;
  presenceLastActivity = {};
}

// Logout automatico por inactividad: chequea en el mismo tick que el
// heartbeat de presencia (cada 30s) si paso 1 hora desde el ultimo
// mousemove/keydown/click/scroll/touchstart local (ver listener mas abajo).
async function checkIdleLogout() {
  if (!state.profile) return;
  localStorage.setItem(LAST_ACTIVITY_LS_KEY, String(lastLocalActivity));
  if (Date.now() - lastLocalActivity < IDLE_LOGOUT_MS) return;
  await performLogout();
  showToast("Se cerro tu sesion por inactividad (60 minutos).");
}

// Logout compartido por los 4 puntos de salida (boton del topbar, boton del
// selector de pizarras, "Volver al login" de cuenta pendiente/desactivada, y
// el auto-logout por inactividad de arriba) -- antes cada uno repetia esta
// secuencia a mano y alguno se olvidaba stopPresence(), dejando el heartbeat
// corriendo despues de cerrar sesion.
async function performLogout() {
  await withBusy(() => authApi.logout());
  state.profile = null;
  localStorage.removeItem(LAST_ACTIVITY_LS_KEY);
  teardownBoardRealtimeSubscription();
  stopPresence();
  showLoginScreen();
}

function sendPresenceHeartbeat() {
  realtimeApi.trackPresence(presenceChannel, { nombre: activeUserName(), last_activity: lastLocalActivity });
}

function onPresenceSync(rawState) {
  const next = {};
  for (const [userId, metas] of Object.entries(rawState)) {
    next[userId] = metas.reduce((max, m) => Math.max(max, m.last_activity || 0), 0);
  }
  presenceLastActivity = next;
  if (document.getElementById("view-usuarios")?.classList.contains("active")) renderUsuarios();
  renderTopbarPresence();
}

function presenceStatus(userId) {
  const last = presenceLastActivity[userId];
  if (!last) return "red";
  const diffMin = (Date.now() - last) / 60000;
  if (diffMin <= 15) return "green";
  if (diffMin <= 60) return "yellow";
  return "red";
}

const PRESENCE_LABEL = { green: "Activo", yellow: "Inactivo (+15 min)", red: "Desconectado" };

function presenceDot(userId) {
  const status = presenceStatus(userId);
  return `<span class="presence-dot presence-dot-${status}" title="${PRESENCE_LABEL[status]}"></span>`;
}

// Miembros de la pizarra abierta (para el stack de avatares del topbar) --
// se refresca en cada reloadState, ver mas abajo.
function refreshBoardMembers(pizarraId) {
  if (!pizarraId) { boardMembers = []; renderTopbarPresence(); return; }
  pizarraApi.getBoardMembers(pizarraId)
    .then((members) => { boardMembers = members || []; renderTopbarPresence(); })
    .catch(() => { boardMembers = []; });
}

function renderTopbarPresence() {
  const wrap = $("topbarPresenceStack");
  if (!wrap) return;
  const conectados = boardMembers
    .filter((m) => m.id !== activeUserId())
    .map((m) => ({ ...m, status: presenceStatus(m.id) }))
    .filter((m) => m.status !== "red");
  if (!conectados.length) { wrap.innerHTML = ""; return; }
  const shown = conectados.slice(0, 4);
  const extra = conectados.length - shown.length;
  wrap.innerHTML = shown.map((m) => `
    <span class="presence-avatar presence-avatar-${m.status}" title="${escHtml(m.nombre)} · ${PRESENCE_LABEL[m.status]}">${initialsOf(m.nombre)}</span>
  `).join("") + (extra > 0 ? `<span class="presence-avatar presence-avatar-extra" title="${extra} mas conectados">+${extra}</span>` : "");
}

// Cualquier movimiento de mouse/teclado cuenta como actividad -- se manda
// en el proximo heartbeat, no en cada evento (evita spamear el canal).
["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((evt) => {
  window.addEventListener(evt, () => { lastLocalActivity = Date.now(); }, { passive: true });
});

// Ejecuta una mutacion async y muestra un toast si falla.
async function withBusy(fn) {
  try { await fn(); return true; }
  catch (e) { console.error(e); showToast("Error: " + (e && e.message ? e.message : e)); return false; }
}

function isPersistedTema(tema) { return tema && tema.__persisted !== false; }

function isTemaVisible(t) {
  if (!t.privado) return true;
  return t.creadoPor === activeUserId();
}

function nextUsuarioId() {
  const nums = state.usuarios.map((u) => parseInt(u.id.replace("U-",""), 10)).filter((n) => !isNaN(n));
  return `U-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3,"0")}`;
}

function initTheme() {
  const saved = localStorage.getItem("sgtemas_theme") || "light";
  document.documentElement.dataset.theme = saved;
  applyDarkVisual(saved === "dark");
}

function applyDarkVisual(isDark) {
  const sw = document.getElementById("darkToggleSwitch");
  if (sw) sw.classList.toggle("on", isDark);
}

function canDelete() { return puedeEliminar(); }

// =========================================================
// GDE integration
// =========================================================
const GDE_BASE_URL = "https://eue.gde.gob.ar/expedientes-web/buzonesYConsultas.zul?idUser&numeroConsulta=";
let _gdeWindow = null;
let _toastTimer = null;

function showToast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}

function buildGdeSearchUrl(expediente) {
  if (!expediente || !expediente.trim() || expediente === "N/A") return null;
  const encoded = expediente
    .replace(/ /g, "+")
    .replace(/#/g, "%23");
  return GDE_BASE_URL + encoded;
}

function openGDE(expedienteNumero) {
  const url = buildGdeSearchUrl(expedienteNumero);
  if (!url) return;
  if (_gdeWindow && !_gdeWindow.closed) {
    _gdeWindow.location.href = url;
    _gdeWindow.focus();
  } else {
    _gdeWindow = window.open(url, "gde_session");
  }
  showToast(`Abriendo en GDE: ${expedienteNumero}`);
}

// =========================================================
// DOM refs
// =========================================================
const $ = (id) => document.getElementById(id);

const els = {
  globalSearch:       $("globalSearch"),
  kpiRow:             $("kpiRow"),
  donutResp:          $("donutResp"),
  donutEstado:        $("donutEstado"),
  donutRespTotal:     $("donutRespTotal"),
  donutEstadoTotal:   $("donutEstadoTotal"),
  legendResp:         $("legendResp"),
  legendEstado:       $("legendEstado"),
  semaforoList:       $("semaforoList"),
  alertList:          $("alertList"),
  atencionList:       $("atencionList"),
  agendaKanban:       $("agendaKanban"),
  tableHitos:         $("tableHitos"),
  tableExpedientes:   $("tableExpedientes"),
  tableAlertas:       $("tableAlertas"),
  reportCards:        $("reportCards"),
  drawer:             $("drawer"),
  drawerBody:         $("drawerBody"),
  drawerOverlay:      $("drawerOverlay"),
  closeDrawer:        $("closeDrawer"),
  closeDrawerX:       $("closeDrawerX"),
  modalForm:          $("modalForm"),
  dynamicForm:        $("dynamicForm"),
  modalTask:          $("modalTask"),
  taskForm:           $("taskForm"),
  modalImagePreview:  $("modalImagePreview"),
  respGrid:           $("respGrid"),
  respTarjetas:       $("respTarjetas"),
  respLista:          $("respLista"),
  tbodyResponsables:  $("tbodyResponsables"),
  cfgNombre:          $("cfgNombre"),
  cfgEmail:           $("cfgEmail"),
  cfgPassActual:      $("cfgPassActual"),
  cfgPassNueva:       $("cfgPassNueva"),
  cfgPassConfirmar:   $("cfgPassConfirmar"),
  mfaCardBody:        $("mfaCardBody"),
  userMenu:           $("userMenu"),
  userMenuTrigger:    $("userMenuTrigger"),
  userMenuDropdown:   $("userMenuDropdown"),
  userMenuName:       $("userMenuName"),
  dropdownUserName:   $("dropdownUserName"),
  dropdownLastLogin:  $("dropdownLastLogin"),
  fResponsable:       $("fResponsable"),
  fEstado:            $("fEstado"),
  fPrioridad:         $("fPrioridad"),
  fEtiqueta:          $("fEtiqueta"),
  btnMisTemas:        $("btnMisTemas"),
  fHResponsable:      $("fHResponsable"),
  fHEstado:           $("fHEstado"),
  fHPrioridad:        $("fHPrioridad"),
  fHEtiqueta:         $("fHEtiqueta"),
  btnMisHitos:        $("btnMisHitos"),
  clearHitosFilters:  $("clearHitosFilters"),
  calGrid:            $("calGrid"),
  calTitle:           $("calTitle"),
  boardMenuBtn:       $("boardMenuBtn"),
  boardMenu:          $("boardMenu"),
  boardMenuOverlay:   $("boardMenuOverlay"),
  boardMenuBack:      $("boardMenuBack"),
  boardMenuTitle:     $("boardMenuTitle"),
  boardMenuClose:     $("boardMenuClose"),
  boardMenuBody:      $("boardMenuBody"),
  toggleReportFilters:      $("toggleReportFilters"),
  reportFiltersPanel:       $("reportFiltersPanel"),
  reportFiltersGrid:        $("reportFiltersGrid"),
  reportDateField:          $("reportDateField"),
  reportDateFrom:           $("reportDateFrom"),
  reportDateTo:             $("reportDateTo"),
  reportChipsEstado:        $("reportChipsEstado"),
  reportChipsPrioridad:     $("reportChipsPrioridad"),
  reportChipsResponsable:   $("reportChipsResponsable"),
  reportChipsDependencia:   $("reportChipsDependencia"),
  reportChipsEtiqueta:      $("reportChipsEtiqueta"),
  reportExpediente:         $("reportExpediente"),
  reportSoloVencidos:       $("reportSoloVencidos"),
  reportIncluirPrivados:    $("reportIncluirPrivados"),
  reportIncluirPrivadosRow: $("reportIncluirPrivadosRow"),
  reportSoloConExpediente:  $("reportSoloConExpediente"),
  reportSeccionResumen:     $("reportSeccionResumen"),
  reportSeccionTemas:       $("reportSeccionTemas"),
  reportSeccionHitos:       $("reportSeccionHitos"),
  reportSeccionExpedientes: $("reportSeccionExpedientes"),
  reportSeccionActividad:   $("reportSeccionActividad"),
  reportFiltersHint:        $("reportFiltersHint"),
  resetReportFilters:       $("resetReportFilters"),
  cancelReportFilters:      $("cancelReportFilters"),
  applyReportFilters:       $("applyReportFilters"),
  planillaSplitBtn:   $("planillaSplitBtn"),
  planillaArrow:      $("planillaArrow"),
  planillaMenu:       $("planillaMenu"),
  planillaExcelBtn:   $("planillaExcelBtn"),
  planillaPdfBtn:     $("planillaPdfBtn"),
  informeSplitBtn:    $("informeSplitBtn"),
  informeArrow:       $("informeArrow"),
  informeMenu:        $("informeMenu"),
  informeWordBtn:     $("informeWordBtn"),
  informePdfBtn:      $("informePdfBtn"),
  pizarraSwitcher:       $("pizarraSwitcher"),
  pizarraSwitcherList:   $("pizarraSwitcherList"),
  pizarraSwitcherCreate: $("pizarraSwitcherCreate"),
  menuCambiarPizarra:    $("menuCambiarPizarra"),
  topbarPizarraBtn:      $("topbarPizarraBtn"),
  topbarPizarraNombre:   $("topbarPizarraNombre"),
  topbarInviteBtn:       $("topbarInviteBtn")
};

let calCursor = new Date();
let drawerHasUnsavedChanges = false;
let currentDrawerTemaId = null;
let respViewMode = "tarjetas";
let showMisTemasOnly = false;
let showMisHitosOnly = false;

// =========================================================
// Init / events
// =========================================================
init();

function init() {
  initTheme();
  bindEvents();
  fillFilterOptions();
  renderAppVersion();
  boot();
}

// __APP_VERSION__ lo define vite.config.js a partir de package.json al
// buildear (ver ese archivo). Solo cambia cuando bump-version.yml lo
// commitea a main tras un despliegue a produccion — un build de test/preview
// muestra siempre el numero que ya estaba commiteado en esa rama.
function renderAppVersion() {
  const el = $("loginVersion");
  if (!el) return;
  const [major, minor] = __APP_VERSION__.split(".");
  el.textContent = `Notby V.${major}.${minor}`;
}

// Muestra el chrome del login (pantalla completa, centrado) sin decidir todavia
// que formulario renderizar adentro -- lo comparten el camino de password
// recovery, el gate de MFA y showLoginScreen().
function showLoginScreenChrome() {
  const ls = $("loginScreen");
  const app = document.querySelector(".app");
  if (ls) { ls.style.display = "grid"; ls.style.placeItems = "center"; }
  if (app) app.style.display = "none";
}

// Resuelve la sesion de Supabase y decide que pantalla mostrar.
async function boot() {
  // La sesion vino de clickear el link de "olvide mi contrasena": no es un
  // login normal, hay que forzar elegir una nueva antes de entrar a la app.
  if (authApi.isPasswordRecovery()) {
    showLoginScreenChrome();
    renderNewPassword();
    return;
  }

  let session;
  try { session = await authApi.getSession(); }
  catch (e) { console.error(e); }

  if (!session) { showLoginScreen(); return; }

  // La sesion de Supabase (dura dias via refresh token) no sabe nada de
  // nuestro umbral de 60min de inactividad -- eso solo vivia en la variable
  // lastLocalActivity, que se pierde si se cierra el navegador o el SO
  // descarta la pestana. Reconstruimos esa marca desde localStorage antes de
  // confiar en la sesion: si paso el umbral, cerramos sesion aca en vez de
  // dejar entrar directo (ver LAST_ACTIVITY_LS_KEY).
  const storedActivity = Number(localStorage.getItem(LAST_ACTIVITY_LS_KEY));
  if (storedActivity && Date.now() - storedActivity >= IDLE_LOGOUT_MS) {
    localStorage.removeItem(LAST_ACTIVITY_LS_KEY);
    await authApi.logout();
    showLoginScreen();
    showToast("Se cerro tu sesion por inactividad (60 minutos).");
    return;
  }

  // 2FA (opcional, TOTP): si el usuario ya enrolo y verifico un factor, la
  // sesion recien autenticada por password queda en aal1 -- nextLevel pasa a
  // aal2 y hay que desafiarlo antes de cargar su perfil/datos. Quien nunca
  // activo 2FA sigue con currentLevel === nextLevel siempre, asi que este
  // chequeo es un no-op para el resto de los usuarios.
  let aal = null;
  try { aal = await authApi.mfaGetAal(); } catch (e) { console.error(e); }
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    showLoginScreenChrome();
    renderMfaChallenge();
    return;
  }

  let profile = null;
  try { profile = await authApi.loadProfile(); }
  catch (e) { console.error(e); }

  if (!profile) { showLoginScreen(); return; }
  if (!profile.aprobado) { showAccessNotice("pendiente"); return; }
  if (!profile.activo) { showAccessNotice("desactivada"); return; }

  state.profile = profile;
  state.config.currentUser = profile.nombre;
  state.config.rol = profile.rol;
  lastLocalActivity = Date.now();
  localStorage.setItem(LAST_ACTIVITY_LS_KEY, String(lastLocalActivity));
  startPresence();

  let pizarras = [];
  try { pizarras = await pizarraApi.listMyPizarras(); }
  catch (e) { console.error(e); }

  const lastId = localStorage.getItem(PIZARRA_LS_KEY);
  const target = pizarras.length === 1 ? pizarras[0].id : pizarras.find((p) => p.id === lastId)?.id;

  if (target) await enterPizarra(target);
  else await showPizarraSwitcher();
}

// =========================================================
// Selector de pizarras (tableros)
// =========================================================
const PIZARRA_LS_KEY = "sgtemas_last_pizarra";

async function enterPizarra(id) {
  localStorage.setItem(PIZARRA_LS_KEY, id);
  if (els.pizarraSwitcher) els.pizarraSwitcher.classList.remove("open");
  showApp();
  const ok = await withBusy(() => reloadState(id));
  if (ok) authApi.touchLastAccess().catch(() => {});
}

async function showPizarraSwitcher() {
  const app = document.querySelector(".app");
  const ls = $("loginScreen");
  if (app) app.style.display = "none";
  if (ls) ls.style.display = "none";
  els.pizarraSwitcher.classList.add("open");
  await renderPizarraSwitcherScreen();
}

async function renderPizarraSwitcherScreen() {
  let pizarras = [];
  try { pizarras = await pizarraApi.listMyPizarras(); }
  catch (e) { console.error(e); }

  els.pizarraSwitcherList.innerHTML = pizarras.length
    ? pizarras.map((p) => `
      <button type="button" class="pizarra-row" data-pizarra-enter="${p.id}">
        <span class="pizarra-row-main">
          ${icon(p.tipo === "colaborativa" ? "pizarraColaborativa" : "usuario", 18)}
          <span class="pizarra-row-nombre">${escHtml(p.nombre)}</span>
        </span>
        <span class="pizarra-row-type">${p.tipo === "colaborativa" ? "Colaborativa" : "Personal"}</span>
      </button>`).join("")
    : `<p class="login-sub" style="margin-bottom:8px">Todavia no tenes ninguna pizarra. Crea la primera abajo.</p>`;

  els.pizarraSwitcherList.querySelectorAll("[data-pizarra-enter]").forEach((btn) => {
    btn.addEventListener("click", () => enterPizarra(btn.dataset.pizarraEnter));
  });

  els.pizarraSwitcherCreate.innerHTML = `
    <form id="pizarraCreateForm" class="pizarra-create-form">
      <label>Nombre de la pizarra nueva<input name="nombre" required placeholder="Ej: Obra Norte" /></label>
      <label>Tipo
        <select name="tipo">
          <option value="personal">Personal (solo yo)</option>
          <option value="colaborativa">Colaborativa</option>
        </select>
      </label>
      <button class="pizarra-create-btn" type="submit">${icon("dashboardGrid", 15)} Crear pizarra</button>
    </form>
    <button type="button" class="pizarra-logout-btn" id="pizarraSwitcherLogout">Salir</button>
  `;
  document.getElementById("pizarraCreateForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const nombre = (data.nombre || "").trim();
    if (!nombre) return;
    await withBusy(async () => {
      const nueva = await pizarraApi.createPizarra({ nombre, tipo: data.tipo });
      await enterPizarra(nueva.id);
    });
  });

  document.getElementById("pizarraSwitcherLogout")?.addEventListener("click", async () => {
    if (!confirm("Cerrar sesion?")) return;
    await performLogout();
  });
}

function bindEvents() {
  document.getElementById("tabbar").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-item");
    if (!btn) return;
    navigateTo(btn.dataset.view);
  });

  document.querySelectorAll("[data-link]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(a.dataset.link);
    });
  });

  document.querySelectorAll(".data-table th.sortable").forEach((th) => {
    th.addEventListener("click", () => setTableSort(th.dataset.sortTable, th.dataset.sortKey));
  });

  els.userMenuTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    els.userMenu.classList.toggle("open");
  });

  els.userMenuDropdown.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-item").forEach((m) => m.classList.remove("active"));
      showView(btn.dataset.view);
    });
  });

  els.userMenuDropdown.addEventListener("click", (e) => {
    if (e.target.closest(".user-menu-item")) els.userMenu.classList.remove("open");
  });

  els.menuCambiarPizarra?.addEventListener("click", () => showPizarraSwitcher());
  els.topbarPizarraBtn?.addEventListener("click", () => showPizarraSwitcher());
  els.topbarInviteBtn?.addEventListener("click", () => openColaboradoresModal());

  els.modalImagePreview.addEventListener("click", (e) => {
    if (e.target === els.modalImagePreview) els.modalImagePreview.close();
  });
  document.getElementById("imgPreviewCloseBtn").addEventListener("click", () => els.modalImagePreview.close());

  $("btnNewTema").addEventListener("click", () => openTemaForm());
  $("btnNewExpediente").addEventListener("click", () => openExpedienteForm());
  $("btnNewResponsable").addEventListener("click", () => openResponsableForm());
  $("btnNewUsuario").addEventListener("click", () => openUsuarioForm());

  document.querySelectorAll(".resp-tab").forEach((t) => {
    t.addEventListener("click", () => {
      document.querySelectorAll(".resp-tab").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      respViewMode = t.dataset.respTab;
      renderResponsables();
    });
  });

  $("clearFilters").addEventListener("click", () => {
    [els.fResponsable, els.fEstado, els.fPrioridad, els.fEtiqueta].forEach((s) => (s.value = ""));
    showMisTemasOnly = false;
    els.btnMisTemas.classList.remove("mis-temas-active");
    renderAll();
  });

  [els.fResponsable, els.fEstado, els.fPrioridad, els.fEtiqueta].forEach((s) => s.addEventListener("change", renderAll));
  els.globalSearch.addEventListener("input", renderAll);

  els.btnMisTemas.addEventListener("click", () => {
    showMisTemasOnly = !showMisTemasOnly;
    els.btnMisTemas.classList.toggle("mis-temas-active", showMisTemasOnly);
    renderAll();
  });

  els.clearHitosFilters.addEventListener("click", () => {
    [els.fHResponsable, els.fHEstado, els.fHPrioridad, els.fHEtiqueta].forEach((s) => (s.value = ""));
    showMisHitosOnly = false;
    els.btnMisHitos.classList.remove("mis-temas-active");
    renderAll();
  });

  [els.fHResponsable, els.fHEstado, els.fHPrioridad, els.fHEtiqueta].forEach((s) => s.addEventListener("change", renderAll));

  els.btnMisHitos.addEventListener("click", () => {
    showMisHitosOnly = !showMisHitosOnly;
    els.btnMisHitos.classList.toggle("mis-temas-active", showMisHitosOnly);
    renderAll();
  });

  wireKanbanPanScroll();

  els.closeDrawer.addEventListener("click", attemptCloseDrawer);
  els.closeDrawerX.addEventListener("click", attemptCloseDrawer);
  els.drawerOverlay.addEventListener("click", attemptCloseDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && els.drawer.classList.contains("open")) attemptCloseDrawer();
  });

  els.boardMenuBtn.addEventListener("click", openBoardMenu);
  els.boardMenuClose.addEventListener("click", closeBoardMenu);
  els.boardMenuOverlay.addEventListener("click", closeBoardMenu);
  els.boardMenuBack.addEventListener("click", boardMenuGoBack);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !els.boardMenu.classList.contains("hidden")) closeBoardMenu();
  });

  $("calToday").addEventListener("click", calGoToday);
  $("calPrev").addEventListener("click", () => calStep(-1));
  $("calNext").addEventListener("click", () => calStep(1));
  document.querySelectorAll("[data-cal-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      calViewMode = btn.dataset.calView;
      document.querySelectorAll("[data-cal-view]").forEach((b) => b.classList.toggle("active", b === btn));
      renderCalendar();
    });
  });

  $("saveConfig").addEventListener("click", async () => {
    const user = getSessionUser();
    if (!user) return;
    const nombre = els.cfgNombre.value.trim();
    const email = els.cfgEmail.value.trim().toLowerCase();
    if (!nombre) { showToast("El nombre es requerido"); return; }
    if (!email) { showToast("El email es requerido"); return; }
    await withBusy(async () => {
      const updated = await authApi.updateOwnProfile({ nombre, email });
      if (updated) {
        state.profile = updated;
        state.config.currentUser = updated.nombre;
      }
      renderAll();
      showToast("Datos guardados");
    });
  });

  $("savePassword").addEventListener("click", async () => {
    const user = getSessionUser();
    if (!user) return;
    const actual = els.cfgPassActual.value;
    const nueva = els.cfgPassNueva.value;
    const confirmar = els.cfgPassConfirmar.value;
    if (nueva.length < 6) { showToast("La nueva contraseña debe tener al menos 6 caracteres"); return; }
    if (nueva !== confirmar) { showToast("Las contraseñas no coinciden"); return; }
    try {
      await authApi.changePassword(actual, nueva);
      els.cfgPassActual.value = "";
      els.cfgPassNueva.value = "";
      els.cfgPassConfirmar.value = "";
      showToast("Contraseña actualizada");
    } catch (err) {
      if (err && err.code === "bad_current_password") showToast("Contraseña actual incorrecta");
      else showToast("No se pudo actualizar la contraseña");
    }
  });

  wireReportFiltersPanel();

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".resp-dropdown")) {
      document.querySelectorAll(".resp-dropdown.open").forEach((x) => x.classList.remove("open"));
    }
    if (!e.target.closest("#userMenu")) {
      els.userMenu.classList.remove("open");
    }
  });

  const darkBtn = $("darkToggle");
  if (darkBtn) {
    darkBtn.addEventListener("click", () => {
      const isDark = !getDark();
      document.documentElement.dataset.theme = isDark ? "dark" : "light";
      localStorage.setItem("sgtemas_theme", isDark ? "dark" : "light");
      applyDarkVisual(isDark);
      renderDashboard();
    });
  }

  // Cambios remotos diferidos mientras un modal estaba abierto (ver
  // onRemoteBoardChange): se aplican recien al cerrarlo, sin importar si
  // se cerro por Cancelar, Escape, o un Submit que ya disparo su propio
  // reloadState (ese caso queda un refetch de mas, inofensivo).
  [els.modalTask, els.modalForm].forEach((dialog) => {
    dialog?.addEventListener("close", () => {
      if (!pendingRemoteRefresh) return;
      pendingRemoteRefresh = false;
      reloadState(state.currentPizarraId);
    });
  });

  // Botones "Cancelar/Cerrar" de formularios dentro de modalForm (varios
  // renders distintos: renamePizarra, invitar colaborador, expediente,
  // responsable, aviso de registro) -- delegado en vez de un onclick=""
  // inline por boton, para no necesitar 'unsafe-inline' en script-src (CSP).
  els.modalForm?.addEventListener("click", (e) => {
    if (e.target.closest(".js-close-modal-form")) els.modalForm.close();
  });

  // Red de seguridad independiente del estado del canal Realtime: al volver
  // a esta pestana (otro monitor, otra app, la laptop durmiendo) se fuerza
  // un refetch y se recrea la suscripcion, sin depender de haber detectado
  // bien que el socket se habia caido (ver onBoardChannelStatus).
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (!state.currentPizarraId) return;
    const modalAbierto = Boolean((els.modalTask && els.modalTask.open) || (els.modalForm && els.modalForm.open));
    if (modalAbierto) return;
    ensureBoardRealtimeSubscription(state.currentPizarraId, true);
    reloadState(state.currentPizarraId);
  });

  const logoutBtn = $("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (!confirm("Cerrar sesion?")) return;
      await performLogout();
    });
  }
}

function showView(view) {
  if (view === "usuarios" && !esAdmin()) view = "dashboard";
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  const target = document.getElementById(`view-${view}`);
  if (target) target.classList.add("active");
  document.querySelector(".main")?.classList.toggle("main-fill", view === "calendario");
  if (view === "agenda") renderAgenda();
  if (view === "hitos") renderHitos();
  if (view === "calendario") renderCalendar();
  if (view === "responsables") renderResponsables();
  if (view === "usuarios") renderUsuarios();
  if (view === "mispizarras") renderMisPizarras();
  if (view === "configuracion") renderSeguridadCard();
}

function navigateTo(view) {
  document.querySelectorAll(".tab-item").forEach((m) => m.classList.remove("active"));
  const tab = document.querySelector(`.tab-item[data-view="${view}"]`);
  if (tab) tab.classList.add("active");
  showView(view);
}

function showLoginScreen() {
  showLoginScreenChrome();
  if (els.pizarraSwitcher) els.pizarraSwitcher.classList.remove("open");
  renderLogin();
}

function showApp() {
  const ls = $("loginScreen");
  const app = document.querySelector(".app");
  if (ls) ls.style.display = "none";
  if (app) app.style.display = "";
  if (els.pizarraSwitcher) els.pizarraSwitcher.classList.remove("open");
  updateHeaderForRole();
}

// Aviso en la pantalla de login para cuentas pendientes/desactivadas.
function showAccessNotice(kind) {
  const ls = $("loginScreen");
  const app = document.querySelector(".app");
  if (ls) { ls.style.display = "grid"; ls.style.placeItems = "center"; }
  if (app) app.style.display = "none";
  if (els.pizarraSwitcher) els.pizarraSwitcher.classList.remove("open");
  const wrap = $("loginFormWrap");
  if (!wrap) return;
  const isOff = kind === "desactivada";
  const msg = isOff
    ? "Tu cuenta esta desactivada. Contacta a un administrador."
    : "Tu solicitud de acceso esta pendiente de aprobacion por un administrador.";
  wrap.innerHTML = `
    <div class="login-${isOff ? "error" : "success"}">${msg}</div>
    <button type="button" class="login-link" id="noticeLogout" style="margin-top:10px">Volver al login</button>`;
  $("noticeLogout").addEventListener("click", async () => {
    await performLogout();
  });
}

function updateHeaderForRole() {
  const mu = $("menuUsuarios");
  if (mu) mu.style.display = esAdmin() ? "" : "none";
  const btnNU = $("btnNewUsuario");
  if (btnNU) btnNU.style.display = esAdmin() ? "" : "none";
  const btnNT = $("btnNewTema");
  if (btnNT) btnNT.style.display = puedeEditar() ? "" : "none";
  const btnNE = $("btnNewExpediente");
  if (btnNE) btnNE.style.display = puedeEditar() ? "" : "none";
  const btnNR = $("btnNewResponsable");
  if (btnNR) btnNR.style.display = puedeEditar() ? "" : "none";

  const user = getSessionUser();
  if (user) {
    if (els.userMenuName) els.userMenuName.textContent = user.nombre;
    if (els.dropdownUserName) els.dropdownUserName.textContent = user.nombre;
    const initials = user.nombre.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const topbarAv = $("topbarAvatar");
    if (topbarAv) topbarAv.textContent = initials;
  }
  if (els.dropdownLastLogin) {
    const last = state.profile ? state.profile.ultimoAcceso : "";
    els.dropdownLastLogin.textContent = `Ultima conexion: ${last ? fmtDateTimeNice(last) : "—"}`;
  }

  if (els.topbarPizarraNombre) els.topbarPizarraNombre.textContent = state.pizarraActual ? state.pizarraActual.nombre : "";
  if (els.topbarPizarraBtn) els.topbarPizarraBtn.style.display = state.pizarraActual ? "" : "none";
  // Invitar colaborador: solo el creador de la pizarra actual puede sumar
  // gente (mismo criterio que la policy pc_insert de pizarra_colaboradores).
  if (els.topbarInviteBtn) els.topbarInviteBtn.style.display = esCreadorPizarra() ? "" : "none";
}

// =========================================================
// Login / Register UI
// =========================================================
function renderLogin() {
  const wrap = $("loginFormWrap");
  if (!wrap) return;
  wrap.innerHTML = `
    <form class="login-form" id="loginFormEl">
      <label>Email<input type="email" id="loginEmail" autocomplete="email" required /></label>
      <label>Contraseña<input type="password" id="loginPass" autocomplete="current-password" required /></label>
      <div id="loginMsg"></div>
      <button type="submit" class="login-btn">Ingresar</button>
      <button type="button" class="login-link" id="goForgot">¿Olvidaste tu contraseña?</button>
      <button type="button" class="login-link" id="goRegister">Crear cuenta</button>
    </form>`;
  $("goForgot").addEventListener("click", renderForgotPassword);
  $("loginFormEl").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("loginEmail").value.trim().toLowerCase();
    const pass  = $("loginPass").value;
    const msg   = $("loginMsg");
    const btn   = e.target.querySelector(".login-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Ingresando..."; }
    try {
      await authApi.login(email, pass);
      await boot();
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = "Ingresar"; }
      msg.innerHTML = `<div class="login-error">Email o contraseña incorrectos.</div>`;
    }
  });
  $("goRegister").addEventListener("click", renderRegister);
}

function renderRegister() {
  const wrap = $("loginFormWrap");
  if (!wrap) return;
  wrap.innerHTML = `
    <form class="login-form" id="regFormEl">
      <label>Nombre<input type="text" id="regNombre" required /></label>
      <label>Apellido<input type="text" id="regApellido" required /></label>
      <label>Email<input type="email" id="regEmail" required /></label>
      <label>Contraseña<input type="password" id="regPass" required /></label>
      <label>Confirmar contraseña<input type="password" id="regPass2" required /></label>
      <div id="regMsg"></div>
      <button type="submit" class="login-btn">Crear cuenta</button>
      <button type="button" class="login-link" id="goLogin">Volver al login</button>
    </form>`;
  $("goLogin").addEventListener("click", renderLogin);
  $("regFormEl").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("regMsg");
    const nombre = `${$("regNombre").value.trim()} ${$("regApellido").value.trim()}`.trim();
    const email  = $("regEmail").value.trim().toLowerCase();
    const pass   = $("regPass").value;
    const pass2  = $("regPass2").value;
    if (pass !== pass2) { msg.innerHTML = `<div class="login-error">Las contraseñas no coinciden.</div>`; return; }
    if (pass.length < 6) { msg.innerHTML = `<div class="login-error">La contraseña debe tener al menos 6 caracteres.</div>`; return; }
    const btn = e.target.querySelector(".login-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }
    try {
      const { session } = await authApi.register(nombre, email, pass);
      if (session) {
        // Cuenta aprobada al instante (sin intervencion de un admin, ver
        // handle_new_user en supabase/migrations/021): ya hay sesion activa
        // y boot() encuentra la pizarra personal recien creada por el
        // trigger, asi que entra directo a la app.
        await boot();
        return;
      }
      // El proyecto exige confirmar el email antes de dar sesion (distinto
      // entre entornos: ver nota de mailer_autoconfirm en 021) -- la cuenta
      // y su pizarra personal ya existen, solo falta que confirme el mail.
      msg.innerHTML = `<div class="login-success">Te mandamos un correo a ${escHtml(email)} para confirmar tu cuenta. Confirmala y volve a entrar.</div>`;
      setTimeout(() => renderLogin(), 3500);
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = "Crear cuenta"; }
      const already = /registered|already/i.test(err && err.message ? err.message : "");
      msg.innerHTML = `<div class="login-error">${already ? "Ya existe un usuario con ese email." : "No se pudo completar el registro."}</div>`;
    }
  });
}

// =========================================================
// Recuperar contraseña — email -> link de un solo uso -> nueva contraseña.
//
// Nota: el pedido original era un flujo por CODIGO de 6 digitos, no por
// link (ver TODO en authApi.requestPasswordReset con el motivo exacto:
// Supabase no deja personalizar la plantilla del email sin plan pago o SMTP
// propio). Mientras tanto usamos el link que Supabase manda por defecto:
// vuelve a esta misma app (redirectTo) con una sesion de recuperacion
// activa, y boot() (ver mas arriba) detecta esa sesion via
// authApi.isPasswordRecovery() y muestra renderNewPassword() directamente,
// sin pasar por el login normal.
// =========================================================

// Clasifica el error de un intento de envio de email: 429 = limite de envios
// (mensaje especifico); cualquier otro status numerico = respuesta real del
// servidor (seguimos igual, sin revelar si el email existe o no); sin status
// = nunca llego a golpear la API (fallo de red real, ahi si avisamos).
function classifyMailError(err) {
  if (err && err.status === 429) return "rate_limited";
  if (err && typeof err.status === "number") return "server_response";
  return "network";
}

function renderForgotPassword() {
  const wrap = $("loginFormWrap");
  if (!wrap) return;

  function showSuccess() {
    wrap.innerHTML = `
      <div class="login-success">Si el email está registrado, te llega un correo con un link para elegir tu nueva contraseña. Revisá también la carpeta de spam.</div>
      <button type="button" class="login-link" id="goLoginFromForgot2">Volver al login</button>`;
    $("goLoginFromForgot2").addEventListener("click", renderLogin);
  }

  wrap.innerHTML = `
    <form class="login-form" id="forgotFormEl">
      <p class="login-sub" style="margin:0 0 4px">Ingresá el email con el que creaste tu usuario. Te vamos a mandar un link para elegir una nueva contraseña.</p>
      <label>Email<input type="email" id="forgotEmail" autocomplete="email" required /></label>
      <div id="forgotMsg"></div>
      <button type="submit" class="login-btn">Enviar link</button>
      <button type="button" class="login-link" id="goLoginFromForgot">Volver al login</button>
    </form>`;
  $("goLoginFromForgot").addEventListener("click", renderLogin);
  $("forgotFormEl").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("forgotEmail").value.trim().toLowerCase();
    const msg = $("forgotMsg");
    const btn = e.target.querySelector(".login-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }
    try {
      await authApi.requestPasswordReset(email);
      showSuccess();
    } catch (err) {
      const kind = classifyMailError(err);
      if (kind === "server_response") { showSuccess(); return; }
      if (btn) { btn.disabled = false; btn.textContent = "Enviar link"; }
      msg.innerHTML = kind === "rate_limited"
        ? `<div class="login-error">Ya pediste un link hace poco. Esperá un minuto y probá de nuevo.</div>`
        : `<div class="login-error">No se pudo enviar el link. Revisá tu conexión e intentá de nuevo.</div>`;
    }
  });
}

function renderNewPassword() {
  const wrap = $("loginFormWrap");
  if (!wrap) return;
  wrap.innerHTML = `
    <form class="login-form" id="newPassFormEl">
      <p class="login-sub" style="margin:0 0 4px">Elegí tu nueva contraseña.</p>
      <label>Nueva contraseña<input type="password" id="newPass1" autocomplete="new-password" required /></label>
      <label>Confirmar contraseña<input type="password" id="newPass2" autocomplete="new-password" required /></label>
      <div id="newPassMsg"></div>
      <button type="submit" class="login-btn">Guardar contraseña</button>
    </form>`;
  $("newPassFormEl").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("newPassMsg");
    const p1 = $("newPass1").value;
    const p2 = $("newPass2").value;
    if (p1 !== p2) { msg.innerHTML = `<div class="login-error">Las contraseñas no coinciden.</div>`; return; }
    if (p1.length < 6) { msg.innerHTML = `<div class="login-error">La contraseña debe tener al menos 6 caracteres.</div>`; return; }
    const btn = e.target.querySelector(".login-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Guardando..."; }
    try {
      await authApi.completePasswordReset(p1);
      state.profile = null;
      wrap.innerHTML = `<div class="login-success">Contraseña actualizada. Iniciá sesión con tu nueva contraseña.</div>`;
      setTimeout(() => renderLogin(), 2500);
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = "Guardar contraseña"; }
      msg.innerHTML = `<div class="login-error">No se pudo actualizar la contraseña. Volvé a pedir un código.</div>`;
    }
  });
}

// Pantalla de desafio de 2FA -- boot() redirige aca (en vez de cargar el
// perfil) cuando la sesion recien autenticada por password esta en aal1 pero
// el usuario tiene un factor TOTP verificado (nextLevel aal2). Quien nunca
// activo 2FA nunca pasa por esta pantalla.
async function renderMfaChallenge() {
  const wrap = $("loginFormWrap");
  if (!wrap) return;
  let factorId = null;
  try {
    const factors = await authApi.mfaListFactors();
    factorId = factors.totp?.find((f) => f.status === "verified")?.id || null;
  } catch (e) { console.error(e); }

  wrap.innerHTML = `
    <form class="login-form" id="mfaChallengeFormEl">
      <p class="login-sub" style="margin:0 0 4px">Ingresá el código de 6 dígitos de tu app de autenticación.</p>
      <label>Código<input type="text" id="mfaCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required autofocus /></label>
      <div id="mfaChallengeMsg"></div>
      <button type="submit" class="login-btn">Verificar</button>
    </form>
    <button type="button" class="link" id="mfaLogoutBtn" style="margin-top:10px;border:0;background:transparent;cursor:pointer;display:block">Cerrar sesión</button>
  `;

  $("mfaLogoutBtn").addEventListener("click", async () => {
    await authApi.logout();
    showLoginScreen();
  });

  $("mfaChallengeFormEl").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("mfaChallengeMsg");
    const code = $("mfaCode").value.trim();
    if (!factorId) {
      msg.innerHTML = `<div class="login-error">No se encontró tu método de verificación. Cerrá sesión y contactá a un administrador.</div>`;
      return;
    }
    const btn = e.target.querySelector(".login-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Verificando..."; }
    try {
      await authApi.mfaChallengeAndVerify(factorId, code);
      await boot();
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = "Verificar"; }
      msg.innerHTML = `<div class="login-error">Código inválido o expirado. Probá de nuevo.</div>`;
    }
  });
}

// =========================================================
// Usuarios view
// =========================================================
function renderUsuarios() {
  const tbActivos = $("tableUsuariosActivos");
  if (!tbActivos) return;
  if (!esAdmin()) { tbActivos.innerHTML = ""; return; }

  const activos = state.usuarios.filter((u) => u.aprobado && u.activo);

  tbActivos.innerHTML = activos.map((u) => `
    <tr>
      <td>${presenceDot(u.id)}</td>
      <td>${escHtml(u.nombre)}</td>
      <td>${escHtml(u.email)}</td>
      <td><span class="rol-badge rol-${u.rol.toLowerCase()}">${u.rol}</span></td>
      <td>${u.ultimoAcceso ? fmtDateTimeNice(u.ultimoAcceso) : "—"}</td>
      <td>
        <div style="display:flex;gap:6px">
          <select class="pill" style="font-size:12px;padding:3px 8px" data-rol-select="${u.id}">
            ${["Admin","Editor","Viewer"].map((r) => `<option ${u.rol === r ? "selected" : ""}>${r}</option>`).join("")}
          </select>
          ${u.id !== state.profile.id ? `<button class="ghost" style="font-size:12px;color:#dc2626" data-desactivar="${u.id}">Desactivar</button>` : ""}
          ${u.id !== state.profile.id ? `<button class="ghost" style="font-size:12px;color:#dc2626" data-eliminar="${u.id}">Eliminar</button>` : ""}
        </div>
      </td>
    </tr>`).join("") || `<tr><td colspan="6" style="color:var(--muted);text-align:center">Sin usuarios.</td></tr>`;

  tbActivos.querySelectorAll("[data-eliminar]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const u = state.usuarios.find((x) => x.id === btn.dataset.eliminar);
      if (!u || !confirm(`Eliminar a ${u.nombre} definitivamente?`)) return;
      try {
        await dataApi.deleteProfile(u.id);
        await reloadState();
        renderUsuarios();
      } catch (err) {
        // 23503 = foreign_key_violation: ya creo temas/comentarios/documentos
        // (esas tablas no tienen ON DELETE CASCADE/SET NULL hacia profiles a
        // proposito, para no perder la atribucion de contenido existente) --
        // no se puede borrar de raiz, "Desactivar" es el camino real.
        if (err && err.code === "23503") {
          showToast(`No se puede eliminar a ${u.nombre}: ya creo contenido en la app. Probá "Desactivar" en su lugar.`);
        } else {
          console.error(err);
          showToast("Error: " + (err && err.message ? err.message : err));
        }
      }
    });
  });

  tbActivos.querySelectorAll("[data-rol-select]").forEach((sel) => {
    sel.addEventListener("change", async () => {
      const u = state.usuarios.find((x) => x.id === sel.dataset.rolSelect);
      if (u) await withBusy(async () => {
        await dataApi.updateProfileRole(u.id, sel.value);
        await reloadState();
        showToast("Rol actualizado");
      });
    });
  });
  tbActivos.querySelectorAll("[data-desactivar]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const u = state.usuarios.find((x) => x.id === btn.dataset.desactivar);
      if (u && confirm(`Desactivar a ${u.nombre}?`)) {
        await withBusy(async () => { await dataApi.deactivateProfile(u.id); await reloadState(); renderUsuarios(); });
      }
    });
  });
}

// =========================================================
// Vista "Mis pizarras" — pizarras propias (colaboradores, renombrar,
// eliminar) y pizarras donde colaboro (mi rol, salir). A diferencia de
// Usuarios, la ve cualquier usuario logueado, no solo Admin.
// =========================================================
async function renderMisPizarras() {
  const elPropias = $("misPizarrasPropias");
  const elColaboro = $("misPizarrasColaboro");
  if (!elPropias || !elColaboro) return;
  elPropias.innerHTML = `<p style="color:var(--muted);font-size:13px">Cargando...</p>`;
  elColaboro.innerHTML = "";

  let pizarras = [];
  try { pizarras = await pizarraApi.listMyPizarras(); }
  catch (e) {
    console.error(e);
    elPropias.innerHTML = `<p style="color:var(--muted);font-size:13px">No se pudieron cargar tus pizarras.</p>`;
    return;
  }

  const myId = activeUserId();
  const propias = pizarras.filter((p) => p.creadorId === myId);
  const colaboro = pizarras.filter((p) => p.creadorId !== myId);

  elPropias.innerHTML = propias.map((p) => `
    <div class="pizarra-mgmt-row">
      <span class="pizarra-mgmt-main">
        ${icon(p.tipo === "colaborativa" ? "pizarraColaborativa" : "usuario", 18)}
        <span class="pizarra-mgmt-nombre">${escHtml(p.nombre)}</span>
        <span class="pizarra-mgmt-type">${p.tipo === "colaborativa" ? "Colaborativa" : "Personal"}</span>
      </span>
      <span class="pizarra-mgmt-actions">
        <button type="button" class="ghost" data-pizarra-entrar="${p.id}">Entrar</button>
        <button type="button" class="ghost" data-pizarra-colab="${p.id}">Colaboradores</button>
        <button type="button" class="ghost" data-pizarra-renombrar="${p.id}">Renombrar</button>
        ${p.protegida
          ? `<span class="pizarra-mgmt-protegida" title="Esta pizarra no se puede eliminar">Protegida</span>`
          : `<button type="button" class="ghost" style="color:#dc2626" data-pizarra-eliminar="${p.id}">Eliminar</button>`}
      </span>
    </div>
  `).join("") || `<p style="color:var(--muted);font-size:13px">Todavía no administrás ninguna pizarra.</p>`;

  elPropias.querySelectorAll("[data-pizarra-entrar]").forEach((btn) => {
    btn.addEventListener("click", () => enterPizarra(btn.dataset.pizarraEntrar));
  });
  elPropias.querySelectorAll("[data-pizarra-colab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = propias.find((x) => x.id === btn.dataset.pizarraColab);
      if (p) openColaboradoresModal(p.id, p.nombre);
    });
  });
  elPropias.querySelectorAll("[data-pizarra-renombrar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = propias.find((x) => x.id === btn.dataset.pizarraRenombrar);
      if (p) openRenamePizarraModal(p);
    });
  });
  elPropias.querySelectorAll("[data-pizarra-eliminar]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const p = propias.find((x) => x.id === btn.dataset.pizarraEliminar);
      if (!p || !confirm(`Eliminar la pizarra "${p.nombre}" para siempre? Se borra todo su contenido (temas, hitos, documentos, etc).`)) return;
      const eraActiva = state.currentPizarraId === p.id;
      const ok = await withBusy(() => pizarraApi.deletePizarra(p.id));
      if (!ok) return;
      showToast("Pizarra eliminada");
      // Si era la pizarra abierta, boot() vuelve a decidir donde entrar
      // (misma resolucion que ya usa el flujo de registro nuevo).
      if (eraActiva) await boot(); else await renderMisPizarras();
    });
  });

  let misPermisos = [];
  try { misPermisos = await pizarraApi.listMisColaboraciones(); } catch (e) { console.error(e); }
  const permisoPorPizarra = Object.fromEntries(misPermisos.map((c) => [c.pizarra_id, c.permiso]));

  const filasColaboro = await Promise.all(colaboro.map(async (p) => {
    let dueno = "";
    try {
      const miembros = await pizarraApi.getBoardMembers(p.id);
      dueno = miembros.find((m) => m.id === p.creadorId)?.nombre || "";
    } catch (e) { console.error(e); }
    const permiso = permisoPorPizarra[p.id] === "edit" ? "Editor" : "Visualizador";
    return `
      <div class="pizarra-mgmt-row">
        <span class="pizarra-mgmt-main">
          ${icon("pizarraColaborativa", 18)}
          <span class="pizarra-mgmt-nombre">${escHtml(p.nombre)}</span>
          <span class="pizarra-mgmt-type">${escHtml(permiso)}${dueno ? ` · de ${escHtml(dueno)}` : ""}</span>
        </span>
        <span class="pizarra-mgmt-actions">
          <button type="button" class="ghost" data-pizarra-entrar="${p.id}">Entrar</button>
          <button type="button" class="ghost" style="color:#dc2626" data-pizarra-salir="${p.id}">Salir</button>
        </span>
      </div>`;
  }));

  elColaboro.innerHTML = filasColaboro.join("") || `<p style="color:var(--muted);font-size:13px">Todavía no colaborás en ninguna pizarra ajena.</p>`;

  elColaboro.querySelectorAll("[data-pizarra-entrar]").forEach((btn) => {
    btn.addEventListener("click", () => enterPizarra(btn.dataset.pizarraEntrar));
  });
  elColaboro.querySelectorAll("[data-pizarra-salir]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const p = colaboro.find((x) => x.id === btn.dataset.pizarraSalir);
      if (!p || !confirm(`Salir de la pizarra "${p.nombre}"?`)) return;
      const eraActiva = state.currentPizarraId === p.id;
      const ok = await withBusy(() => pizarraApi.removeColaborador(p.id, myId));
      if (!ok) return;
      showToast("Saliste de la pizarra");
      if (eraActiva) await boot(); else await renderMisPizarras();
    });
  });
}

// Modal chico para renombrar una pizarra sin tocar nada mas (colaboradores,
// columnas, etc quedan intactos: renamePizarra solo escribe pizarras.nombre).
function openRenamePizarraModal(pizarra) {
  els.dynamicForm.innerHTML = `
    <h3>Renombrar pizarra</h3>
    <label>Nombre<input type="text" id="renamePizarraNombre" value="${escHtml(pizarra.nombre)}" required autofocus /></label>
    <div class="btn-group">
      <button class="primary" value="submit">Guardar</button>
      <button class="ghost js-close-modal-form" type="button">Cancelar</button>
    </div>
  `;
  els.dynamicForm.onsubmit = async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("renamePizarraNombre").value.trim();
    if (!nombre) return;
    const ok = await withBusy(async () => {
      await pizarraApi.renamePizarra(pizarra.id, nombre);
      if (state.currentPizarraId === pizarra.id) await reloadState(state.currentPizarraId);
    });
    if (!ok) return;
    els.modalForm.close();
    showToast("Pizarra renombrada");
    await renderMisPizarras();
  };
  els.modalForm.showModal();
}

// =========================================================
// Filter helpers
// =========================================================
function unique(arr) { return [...new Set(arr.filter(Boolean))]; }

function fillFilterOptions() {
  const visibles = state.temas.filter(isTemaVisible);
  fillSelect(els.fResponsable, unique(visibles.map((t) => t.responsable)), "Responsable");
  fillSelect(els.fEstado, state.columnas.slice().sort((a, b) => a.orden - b.orden).map((c) => c.nombre), "Estado");
  fillSelect(els.fPrioridad, ["Alta", "Media", "Baja"], "Prioridad");
  // Solo etiquetas usadas en temas activos (no Cerrado), para no listar etiquetas muertas.
  const etiquetasActivas = unique(
    visibles.filter((t) => t.estado !== "Cerrado").flatMap((t) => (t.etiquetas || []).map((e) => e.nombre))
  );
  fillSelect(els.fEtiqueta, etiquetasActivas, "Etiquetas");

  fillSelect(els.fHResponsable, unique(visibles.flatMap((t) => t.hitos.map((h) => h.responsable))), "Responsable");
  fillSelect(els.fHEstado, STATES, "Estado");
  fillSelect(els.fHPrioridad, ["Alta", "Media", "Baja"], "Prioridad");
  fillSelect(els.fHEtiqueta, etiquetasActivas, "Etiquetas");
}

function fillSelect(el, options, placeholder) {
  const prev = el.value;
  el.innerHTML = `<option value="">${placeholder}</option>` + options.map((o) => `<option>${escHtml(o)}</option>`).join("");
  el.value = options.includes(prev) ? prev : "";
}

function getFilteredTemas() {
  const q = (els.globalSearch.value || "").trim().toLowerCase();
  const results = state.temas.filter((t) => {
    if (!isTemaVisible(t)) return false;
    if (showMisTemasOnly && !t.responsable.includes(activeUserName())) return false;
    if (els.fResponsable.value && t.responsable !== els.fResponsable.value) return false;
    if (els.fEstado.value && t.estado !== els.fEstado.value) return false;
    if (els.fPrioridad.value && t.prioridad !== els.fPrioridad.value) return false;
    if (els.fEtiqueta.value && !(t.etiquetas || []).some((e) => e.nombre === els.fEtiqueta.value)) return false;
    if (!q) return true;
    const blobTema = [t.id, t.nombre, t.expediente, t.responsable, t.solicitante, t.descripcion, t.estado].join(" ").toLowerCase();
    if (blobTema.includes(q)) return true;
    const hitosMatch = t.hitos.some((h) => [h.nombre, h.responsable, h.descripcion || "", h.estado, h.expediente || ""].join(" ").toLowerCase().includes(q));
    return hitosMatch;
  });
  const sc = $("searchCount");
  if (sc) {
    if (q) { sc.textContent = `${results.length} tema${results.length !== 1 ? "s" : ""} encontrado${results.length !== 1 ? "s" : ""}`; sc.classList.remove("hidden"); }
    else sc.classList.add("hidden");
  }
  return results;
}

// Filtra state.temas segun el panel "Personalizar reporte" de la vista Reportes —
// estado independiente de los filtros globales de arriba (fResponsable, fEstado, etc).
function getReportTemas(filters) {
  const f = filters || state.reportFilters;
  const dependenciasSet = f.dependencias.length
    ? new Set(
        state.responsables
          .filter((r) => f.dependencias.includes(r.dependencia))
          .map((r) => [r.nombre, r.apellido].filter(Boolean).join(" "))
      )
    : null;
  return state.temas.filter((t) => {
    if (!isTemaVisible(t)) return false;
    if (t.privado && !f.incluirPrivados) return false;
    if (f.dateFrom && (t[f.dateField] || "") < f.dateFrom) return false;
    if (f.dateTo && (t[f.dateField] || "") > f.dateTo) return false;
    if (f.estados.length && !f.estados.includes(t.estado)) return false;
    if (f.prioridades.length && !f.prioridades.includes(t.prioridad)) return false;
    const nombresTema = (t.responsable || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (f.responsables.length && !f.responsables.some((r) => nombresTema.includes(r))) return false;
    if (dependenciasSet && !nombresTema.some((n) => dependenciasSet.has(n))) return false;
    if (f.etiquetas.length && !(t.etiquetas || []).some((e) => f.etiquetas.includes(e.nombre))) return false;
    if (f.expediente && !(t.expediente || "").toLowerCase().includes(f.expediente.toLowerCase())) return false;
    if (f.soloVencidos && !(t.estado !== "Cerrado" && daysUntil(t.fechaLimite) < 0)) return false;
    if (f.soloConExpediente && !t.expediente) return false;
    return true;
  });
}

// =========================================================
// Render orchestrator
// =========================================================
function isKnownResp(singleName) {
  const n = (singleName || "").trim();
  if (!n) return false;
  return state.responsables.some((r) => [r.nombre, r.apellido].filter(Boolean).join(" ") === n);
}

function respDisplay(name) {
  if (!name || !name.trim()) return `<span class="resp-unassigned">${icon("alerta", 12)} Sin responsable</span>`;
  return name.split(",").map((s) => {
    const p = s.trim();
    if (!p) return "";
    if (!isKnownResp(p)) {
      return `<span class="resp-unknown" title="No registrado en la base de responsables">${icon("alerta", 12)} ${escHtml(p)}</span>`;
    }
    return escHtml(p);
  }).filter(Boolean).join(", ");
}

function renderAll() {
  fillFilterOptions();
  renderDashboard();
  renderAgenda();
  renderHitos();
  renderExpedientes();
  renderAlertas();
  renderReportes();
  renderResponsables();
  renderConfig();
  updateSortHeaders();
  updateHeaderForRole();
}

function renderConfig() {
  const user = getSessionUser();
  if (user) {
    els.cfgNombre.value = user.nombre;
    els.cfgEmail.value = user.email;
  }
  const topbarAv = $("topbarAvatar");
  if (user) {
    const initials = user.nombre.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    if (els.userMenuName) els.userMenuName.textContent = user.nombre;
    if (els.dropdownUserName) els.dropdownUserName.textContent = user.nombre;
    if (topbarAv) topbarAv.textContent = initials;
  } else {
    if (els.userMenuName) els.userMenuName.textContent = state.config.currentUser;
    if (els.dropdownUserName) els.dropdownUserName.textContent = state.config.currentUser;
  }
}

// 2FA opcional (TOTP) -- solo se pide/consulta cuando el usuario entra a
// Configuracion (ver showView), no en cada renderAll() como renderConfig().
let mfaFactorsCache = null;

async function renderSeguridadCard() {
  if (!els.mfaCardBody) return;
  try { mfaFactorsCache = await authApi.mfaListFactors(); }
  catch (e) { console.error(e); mfaFactorsCache = null; }

  const factor = mfaFactorsCache?.totp?.find((f) => f.status === "verified") || null;
  els.mfaCardBody.innerHTML = factor
    ? `
      <p>Activada — método agregado el ${fmtDateNice(String(factor.created_at).slice(0, 10))}.</p>
      <button type="button" class="ghost" id="mfaDisableBtn" style="color:#dc2626">Desactivar</button>
    `
    : `
      <p style="color:var(--muted)">No está activada. Sumá un paso extra de seguridad con una app de autenticación (Google Authenticator, Authy, etc).</p>
      <button type="button" class="primary" id="mfaEnableBtn">Activar</button>
    `;

  $("mfaEnableBtn")?.addEventListener("click", openMfaEnrollModal);
  $("mfaDisableBtn")?.addEventListener("click", async () => {
    if (!confirm("¿Desactivar la verificación en dos pasos? Ya no se te va a pedir un código extra al iniciar sesión.")) return;
    const ok = await withBusy(() => authApi.mfaUnenroll(factor.id));
    if (ok) { showToast("Autenticación de dos factores desactivada."); renderSeguridadCard(); }
  });
}

// Modal de enrolamiento: se abre ya (con un placeholder) y se puebla cuando
// responde enroll(), mismo patron que openColaboradoresModal -- se percibe
// mas rapido que esperar a la red antes de mostrar el dialog. La limpieza
// del factor sin verificar se engancha al evento nativo "close" del dialog
// (no solo al click de Cancelar) para cubrir tambien la tecla Escape.
function openMfaEnrollModal() {
  let verified = false;
  let factorId = null;

  els.dynamicForm.innerHTML = `<p style="color:var(--muted)">Generando código...</p>`;
  els.modalForm.showModal();

  const onClose = () => {
    els.modalForm.removeEventListener("close", onClose);
    if (!verified && factorId) authApi.mfaUnenroll(factorId).catch(() => {});
  };
  els.modalForm.addEventListener("close", onClose);

  authApi.mfaEnroll().then((data) => {
    factorId = data.id;
    const qrSvg = DOMPurify.sanitize(data.totp.qr_code, { USE_PROFILES: { svg: true, svgFilters: true } });
    els.dynamicForm.innerHTML = `
      <h3>Activar verificación en dos pasos</h3>
      <p>Escaneá este código con tu app de autenticación:</p>
      <div style="display:flex;justify-content:center;margin:12px 0">${qrSvg}</div>
      <p style="font-size:12px;color:var(--muted)">¿No podés escanear? Ingresá este código manualmente: <code>${escHtml(data.totp.secret)}</code></p>
      <label>Código de 6 dígitos<input id="mfaEnrollCode" type="text" inputmode="numeric" maxlength="6" required autofocus /></label>
      <div id="mfaEnrollMsg"></div>
      <div class="btn-group" style="justify-content:flex-end;margin-top:6px">
        <button class="primary" type="submit">Verificar y activar</button>
        <button class="ghost js-close-modal-form" type="button">Cancelar</button>
      </div>
    `;
    els.dynamicForm.onsubmit = async (e) => {
      e.preventDefault();
      const code = $("mfaEnrollCode").value.trim();
      const msg = $("mfaEnrollMsg");
      try {
        await authApi.mfaChallengeAndVerify(factorId, code);
        verified = true;
        els.modalForm.close();
        showToast("Autenticación de dos factores activada.");
        renderSeguridadCard();
      } catch (err) {
        msg.innerHTML = `<div class="login-error">Código inválido. Probá de nuevo.</div>`;
      }
    };
  }).catch(() => {
    els.dynamicForm.innerHTML = `<div class="login-error">No se pudo generar el código. Cerrá esta ventana y probá de nuevo.</div>`;
  });
}

// =========================================================
// DASHBOARD
// =========================================================
function renderDashboard() {
  const temas = getFilteredTemas();
  const today = fmtDate(new Date());
  const allHitos = temas.flatMap((t) => t.hitos.map((h) => ({ ...h, temaId: t.id, temaNombre: t.nombre })));

  const activos = temas.filter((t) => t.estado !== "Cerrado").length;
  const vencidosTemas = temas.filter((t) => t.estado !== "Cerrado" && daysUntil(t.fechaLimite) < 0).length;
  const hitosVencidos = allHitos.filter((h) => h.estado !== "Cerrado" && daysUntil(h.fechaLimite) < 0).length;
  const sinActividad = temas.filter((t) => t.estado !== "Cerrado" && daysBetween(t.ultimaActualizacion, today) > 14).length;
  const bloqueados = temas.filter((t) => t.estado === "Bloqueado").length;

  const temasCerrados = temas.filter((t) => t.estado === "Cerrado");
  const cerradosHoy = temasCerrados.filter((t) => t.fechaCierre === today).length;
  const cerradosHistoricos = temasCerrados.length;

  const kpis = [
    { label: "Temas activos",       val: activos,       tone: "" },
    { label: "Temas vencidos",      val: vencidosTemas, tone: vencidosTemas ? "down" : "" },
    { label: "Hitos vencidos",      val: hitosVencidos, tone: hitosVencidos ? "down" : "" },
    { label: "Sin actividad 14d",   val: sinActividad,  tone: sinActividad ? "down" : "" },
    { label: "Bloqueados",          val: bloqueados,    tone: bloqueados ? "down" : "" },
    { label: "Cerrados hoy",        val: cerradosHoy,   tone: cerradosHoy ? "up" : "", sub: `Historico: ${cerradosHistoricos}` }
  ];

  els.kpiRow.innerHTML = kpis.map((k) => `
    <article class="kpi">
      <small>${k.label}</small>
      <strong>${k.val}</strong>
      <span class="delta ${k.tone || ""}">${k.tone === "down" ? "Atencion" : k.tone === "up" ? "Activo" : "Estable"}</span>
      ${k.sub ? `<span class="kpi-sub">${k.sub}</span>` : ""}
    </article>
  `).join("");

  // Donuts — solo temas activos (no cerrados)
  const temasActivos = temas.filter((t) => t.estado !== "Cerrado");
  const byResp = countBy(temasActivos, "responsable");
  const byEstado = countBy(temasActivos, "estado");
  const columnasOrdenNombres = state.columnas.slice().sort((a, b) => a.orden - b.orden).map((c) => c.nombre);
  renderDonut(els.donutResp, byResp, RESP_PALETTE, "donutResp", els.legendResp);
  renderDonut(els.donutEstado, byEstado, columnasOrdenNombres.map((s) => STATE_COLORS[s] || "#94a3b8"), "donutEstado", els.legendEstado, columnasOrdenNombres);
  els.donutRespTotal.textContent = sum(Object.values(byResp));
  els.donutEstadoTotal.textContent = sum(Object.values(byEstado));

  // Semaforo (temas + hitos)
  const activosTemas = temas.filter((t) => t.estado !== "Cerrado").map((t) => ({ id: t.id, nombre: t.nombre, responsable: t.responsable, fechaLimite: t.fechaLimite, dias: daysUntil(t.fechaLimite), tipo: "Tema" }));
  const activosHitos = allHitos.filter((h) => h.estado !== "Cerrado").map((h) => ({ id: h.temaId, nombre: `${h.temaId}: ${h.nombre}`, responsable: h.responsable, fechaLimite: h.fechaLimite, dias: daysUntil(h.fechaLimite), tipo: "Hito" }));
  const semItems = [...activosTemas, ...activosHitos].filter((x) => x.dias <= 7).map((x) => ({
    ...x,
    level: x.dias < 0 ? "red" : x.dias <= 3 ? "orange" : "yellow",
    when: x.dias < 0 ? `Vencido ${Math.abs(x.dias)}d` : x.dias === 0 ? "Vence hoy" : `${x.dias}d`
  })).sort((a, b) => a.dias - b.dias).slice(0, 8);

  els.semaforoList.innerHTML = semItems.length
    ? semItems.map((x) => `
      <div class="sem-item sem-${x.level}" data-tema="${x.id}">
        <div class="bar"></div>
        <div>
          <div class="nombre">${x.tipo === "Hito" ? '<span class="tipo-badge tipo-hito" title="Hito">◆</span>' : '<span class="tipo-badge tipo-tema" title="Tema">■</span>'} ${escHtml(x.nombre)}</div>
          <div class="meta">${x.id} · ${respDisplay(x.responsable)} · ${fmtDateNice(x.fechaLimite)}</div>
        </div>
        <span class="when">${x.when}</span>
      </div>`).join("")
    : `<p style="color:var(--muted)">Sin vencimientos en los próximos 7 días.</p>`;

  els.semaforoList.querySelectorAll("[data-tema]").forEach((n) =>
    n.addEventListener("click", () => openTemaFormById(n.dataset.tema))
  );

  // Activity feed — últimos 8 eventos del historial global
  const feedEl = $("activityFeed");
  if (feedEl) {
    const allEvents = temas.flatMap((t) =>
      (t.historial || []).map((h) => ({ ...h, temaId: t.id, temaNombre: t.nombre }))
    ).sort((a, b) => (b.at || "").localeCompare(a.at || "")).slice(0, 8);

    feedEl.innerHTML = allEvents.length
      ? allEvents.map((ev) => `
        <div class="feed-row" data-tema="${ev.temaId}">
          <span class="feed-date">${fmtDateFeed(ev.at)}</span>
          <span class="feed-user">${escHtml(ev.by || "sistema")}</span>
          <span class="feed-event">${escHtml(ev.event)}</span>
          <span class="feed-tema">→ ${escHtml(ev.temaNombre)}</span>
        </div>`).join("")
      : `<p style="color:var(--muted);padding:12px 0">Sin actividad registrada.</p>`;

    feedEl.querySelectorAll("[data-tema]").forEach((row) =>
      row.addEventListener("click", () => openTemaFormById(row.dataset.tema))
    );
  }

  // Alertas resumen lateral
  const alerts = buildAlerts(temas).sort((a, b) => b.nivel - a.nivel);
  const nivelIcon = { 4: icon("alerta"), 3: icon("alerta"), 2: icon("circulo"), 1: icon("circulo") };
  const nivelClass = { 4: "rojo", 3: "naranja", 2: "amarillo", 1: "amarillo" };
  els.alertList.innerHTML = alerts.slice(0, 5).map((a) => `
    <div class="alert-item lvl-${nivelClass[a.nivel]}">
      <div class="icon">${nivelIcon[a.nivel]}</div>
      <div>
        <div class="title">${a.esHito ? '<span class="tipo-badge tipo-hito" title="Hito">◆</span>' : '<span class="tipo-badge tipo-tema" title="Tema">■</span>'} ${escHtml(a.tema)}</div>
        <div class="meta">${respDisplay(a.responsable)} · ${a.expediente || "Sin expediente"} · vto ${fmtDateNice(a.fechaLimite)}</div>
      </div>
    </div>`).join("") || `<p style="color:var(--muted)">Sin alertas activas.</p>`;

  // Requieren atencion
  const atencion = [
    ...temas.filter((t) => t.estado !== "Cerrado" && daysUntil(t.fechaLimite) < 0).map((t) => ({ id: t.id, nombre: t.nombre, motivo: "Vencido", tone: "red", esHito: false })),
    ...temas.filter((t) => t.estado === "Bloqueado").map((t) => ({ id: t.id, nombre: t.nombre, motivo: "Bloqueado", tone: "orange", esHito: false })),
    ...temas.filter((t) => t.estado !== "Cerrado" && daysBetween(t.ultimaActualizacion, today) > 14).map((t) => ({ id: t.id, nombre: t.nombre, motivo: "Sin actividad 14d", tone: "yellow", esHito: false })),
    ...allHitos.filter((h) => h.estado !== "Cerrado" && daysUntil(h.fechaLimite) < 0).map((h) => ({ id: h.temaId, nombre: h.nombre, motivo: "Hito vencido", tone: "red", esHito: true })),
    ...allHitos.filter((h) => h.estado === "Bloqueado").map((h) => ({ id: h.temaId, nombre: h.nombre, motivo: "Hito bloqueado", tone: "orange", esHito: true }))
  ].slice(0, 8);

  if (els.atencionList) {
    els.atencionList.innerHTML = atencion.length
      ? atencion.map((x) => `
        <div class="atencion-item" data-tema="${x.id}">
          <span class="atencion-dot dot-${x.tone}"></span>
          <div>
            <div class="atencion-nombre">${x.esHito ? '<span class="tipo-badge tipo-hito" title="Hito">◆</span>' : '<span class="tipo-badge tipo-tema" title="Tema">■</span>'} ${escHtml(x.nombre)}</div>
            <div class="atencion-meta">${x.id} · ${x.motivo}</div>
          </div>
        </div>`).join("")
      : `<p style="color:var(--muted)">Sin temas que requieran atencion.</p>`;

    els.atencionList.querySelectorAll("[data-tema]").forEach((n) =>
      n.addEventListener("click", () => openTemaFormById(n.dataset.tema))
    );
  }
}

// =========================================================
// Donut chart helper
// =========================================================
function renderDonut(canvas, data, palette, key, legendEl, fixedOrder = null) {
  const labels = fixedOrder ? fixedOrder.filter((l) => data[l] != null) : Object.keys(data);
  const values = labels.map((l) => data[l] || 0);
  const colors = labels.map((_, i) => palette[i % palette.length]);
  const total = sum(values) || 1;
  const dark = getDark();
  if (charts[key]) charts[key].destroy();
  charts[key] = new Chart(canvas, {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      cutout: "70%",
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: dark ? "#334155" : "rgba(15,23,42,0.92)",
          titleColor: dark ? "#e2e8f0" : "#ffffff",
          bodyColor: dark ? "#94a3b8" : "rgba(255,255,255,0.78)",
          borderColor: dark ? "#475569" : "rgba(255,255,255,0.1)",
          borderWidth: 1
        }
      }
    }
  });
  legendEl.innerHTML = labels.map((l, i) => `
    <li>
      <i style="background:${colors[i]}"></i>
      <span>${escHtml(l)}</span>
      <span class="pct">${values[i]}</span>
      <span class="pct">${Math.round((values[i] / total) * 100)}%</span>
    </li>`).join("");
}

// =========================================================
// AGENDA — 5-column Kanban / Lista / Calendario
// =========================================================
// Ancho de columna: preferencia de tablero (no de usuario) desde fase 2 —
// se persiste server-side por columna (columnas.ancho_px), ver pizarraApi.
const KANBAN_COL_MIN_W = 220;
const KANBAN_COL_MAX_W = 800;
const KANBAN_COL_DEFAULT_W = 260;

// Paleta de color de columnas: propiedad independiente del nombre
// (columnas.color), elegible por el usuario para cualquier columna,
// incluidas las 5 base. Las primeras 5 son la paleta original protegida
// (Pendiente/En curso/En revision/Bloqueado/Cerrado) — renombrar o
// reordenar una columna nunca las toca, solo un cambio explicito desde
// el selector. Las 7 siguientes son complementarias, para columnas
// nuevas que arma el usuario.
const COLUMNA_COLOR_PALETTE = [
  { key: "red",        label: "Rojo",              hex: "#EF4444" },
  { key: "blue",       label: "Azul",              hex: "#3B82F6" },
  { key: "violet",     label: "Violeta",           hex: "#8B5CF6" },
  { key: "amber",      label: "Ámbar",             hex: "#F59E0B" },
  { key: "green",      label: "Verde",             hex: "#10B981" },
  // Complementarios rediseñados en el manual v2.4 (misma familia OKLCH que
  // la base, contraste >=3:1 con texto blanco en los 7). Las keys se
  // mantienen iguales a las viejas para que las columnas ya guardadas en
  // Supabase (guardan la key, no el hex) recoloreen solas sin migracion.
  { key: "pink",       label: "Rosa",              hex: "#DB2777" },
  { key: "cyan",       label: "Celeste",           hex: "#0891B2" },
  { key: "lime",       label: "Lima",              hex: "#4D7C0F" },
  { key: "magenta",    label: "Fucsia",            hex: "#C026D3" },
  { key: "teal",       label: "Índigo",            hex: "#4F46E5" },
  { key: "amber-dark", label: "Marrón",            hex: "#92400E" },
  { key: "warm-gray",  label: "Gris",              hex: "#71717A" }
];
function columnaColorHex(key) {
  return (COLUMNA_COLOR_PALETTE.find((c) => c.key === key) || COLUMNA_COLOR_PALETTE.find((c) => c.key === "warm-gray")).hex;
}
function columnaColorGridHtml(selectedKey) {
  return `<div class="tagcolor-grid" role="group" aria-label="Seleccionar color de columna">
    ${COLUMNA_COLOR_PALETTE.map((c) => {
      const isSel = c.key === selectedKey;
      return `<button type="button" class="tagcolor-circle${isSel ? " selected" : ""}" data-columna-color="${c.key}"
        style="background:${c.hex}" aria-pressed="${isSel}" aria-label="${escHtml(c.label)}" title="${escHtml(c.label)}">
        ${isSel ? `<span class="tagcolor-check" aria-hidden="true" style="color:#fff">${icon("check", 12)}</span>` : ""}
      </button>`;
    }).join("")}
  </div>`;
}

function renderAgenda() {
  const temas = getFilteredTemas();
  const columnasOrdenadas = state.columnas.slice().sort((a, b) => a.orden - b.orden);

  els.agendaKanban.innerHTML = columnasOrdenadas.map((col, idx) => {
    const items = temas.filter((t) => t.columnaId === col.id);
    const estado = col.nombre;
    const safe = estado.replace(/\s+/g, "-");
    const width = clamp(col.anchoPx || KANBAN_COL_DEFAULT_W, KANBAN_COL_MIN_W, KANBAN_COL_MAX_W);
    const label = `${String(idx + 1).padStart(2, "0")} · ${estado}`;
    const accent = columnaColorHex(col.color);
    return `
      <section class="col col-${safe}" data-estado="${escHtml(estado)}" data-columna-id="${col.id}" style="--col-w:${width}px;background:${accent}14">
        <div class="col-head" style="background:${accent}">
          <span>${escHtml(label)}</span>
          <span class="col-count">${items.length}</span>
        </div>
        <div class="col-resize-handle" data-resize-col title="Arrastrar para ensanchar"></div>
        <div class="kcards">
          ${items.map((t) => {
            const totalH = t.hitos.length;
            const doneH = t.hitos.filter((h) => h.estado === "Cerrado").length;
            const hitoBar = totalH > 0 ? `
              <div class="hito-progress-wrap">
                <div class="hito-progress-bar"><div class="hito-progress-fill" style="width:${Math.round(doneH/totalH*100)}%"></div></div>
                <span class="hito-progress-label">${doneH}/${totalH}</span>
              </div>` : "";
            return `
              <article class="kcard" draggable="true" data-id="${t.id}">
                <button type="button" class="kcard-actions-btn" draggable="false" data-kcard-menu-btn title="Acciones" aria-label="Acciones">${icon("masOpciones", 14)}</button>
                ${t.etiquetas && t.etiquetas.length ? `<div class="etiquetas-chips">${t.etiquetas.map((et) => etiquetaChipHtml(et, { compact: !etiquetasExpandidas })).join("")}</div>` : ""}
                <div class="title">${t.privado ? `${icon("candado", 12)} ` : ""}${escHtml(t.nombre)}</div>
                <div class="kcard-meta-row">
                  <span class="meta mono">${t.id}</span>
                  <span class="meta">${respDisplay(t.responsable)}</span>
                </div>
                ${hitoBar}
                <div class="row">
                  <span class="date-pill ${dateTone(t.fechaLimite, t.estado)}" title="Vencimiento">
                    <span class="ico"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>${fmtDateNice(t.fechaLimite)}
                  </span>
                  <span class="prio prio-${(t.prioridad || "media").toLowerCase()}">${t.prioridad || "Media"}</span>
                </div>
              </article>`;
          }).join("")}
        </div>
        ${puedeEditar() ? `<button class="col-add" data-add-estado="${escHtml(estado)}">+ Agregar tema</button>` : ""}
      </section>`;
  }).join("");

  bindKanban();
}

function bindKanban() {
  let dragId = "";
  els.agendaKanban.querySelectorAll(".kcard").forEach((card) => {
    card.addEventListener("dragstart", () => { dragId = card.dataset.id; card.classList.add("dragging"); });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dragging = els.agendaKanban.querySelector(".kcard.dragging");
      if (!dragging || dragging === card) return;
      const rect = card.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      card.parentElement.insertBefore(dragging, before ? card : card.nextSibling);
    });
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-kcard-menu-btn]")) return;
      if (e.target.closest(".etiquetas-chips")) { toggleEtiquetasExpandidas(); return; }
      openTemaFormById(card.dataset.id);
    });
    const menuBtn = card.querySelector("[data-kcard-menu-btn]");
    menuBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      openKcardMenu(menuBtn, card.dataset.id);
    });
  });
  els.agendaKanban.querySelectorAll(".col").forEach((col) => {
    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.target.closest(".kcard")) return;
      const dragging = els.agendaKanban.querySelector(".kcard.dragging");
      const kcards = col.querySelector(".kcards");
      if (dragging && kcards && dragging.parentElement !== kcards) kcards.appendChild(dragging);
    });
    col.addEventListener("drop", async () => {
      if (!dragId) return;
      const id = dragId; dragId = "";
      const tema = state.temas.find((t) => t.id === id);
      const nuevoEstado = col.dataset.estado;
      const nuevaColumna = state.columnas.find((c) => c.nombre === nuevoEstado);
      const orderedIds = Array.from(col.querySelectorAll(".kcard")).map((c) => c.dataset.id);
      await withBusy(async () => {
        if (tema && tema.estado !== nuevoEstado && nuevaColumna) {
          let extra = {};
          if (nuevoEstado === "Cerrado") {
            extra = { fecha_cierre: fmtDate(new Date()), cerrado_por: activeUserName() };
          } else if (tema.estado === "Cerrado") {
            // Se revierte el cierre: la fecha de cierre se limpia para que
            // los dias restantes vuelvan a contar contra hoy.
            extra = { fecha_cierre: null, cerrado_por: null };
          }
          await dataApi.updateTemaColumna(id, nuevaColumna.id, extra);
          await dataApi.logActivity(id, `Cambio a ${nuevoEstado}`);
        }
        await dataApi.reorderTemas(orderedIds);
        await reloadState();
        const landedCard = els.agendaKanban.querySelector(`.kcard[data-id="${id}"]`);
        if (landedCard) landedCard.classList.add("landed");
      });
    });
  });
  els.agendaKanban.querySelectorAll("[data-add-estado]").forEach((btn) => {
    btn.addEventListener("click", () => openTemaForm(null, btn.dataset.addEstado));
  });

  wireColumnResize();
}

// Arrastrar el handle del borde derecho de una columna para ensancharla/
// angostarla. Las tarjetas adentro no cambian de ancho (grid auto-fill de
// 234px fijos en .kcards) — al ensanchar, simplemente entran mas por fila.
function wireColumnResize() {
  els.agendaKanban.querySelectorAll("[data-resize-col]").forEach((handle) => {
    const col = handle.closest(".col");
    let startX = 0, startWidth = 0;

    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      startX = e.clientX;
      startWidth = col.getBoundingClientRect().width;
      col.classList.add("resizing");
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener("pointermove", (e) => {
      if (!handle.hasPointerCapture(e.pointerId)) return;
      const width = clamp(startWidth + (e.clientX - startX), KANBAN_COL_MIN_W, KANBAN_COL_MAX_W);
      col.style.setProperty("--col-w", `${width}px`);
    });
    const stop = (e) => {
      if (!handle.hasPointerCapture?.(e.pointerId)) return;
      handle.releasePointerCapture(e.pointerId);
      col.classList.remove("resizing");
      const width = Math.round(col.getBoundingClientRect().width);
      const columnaId = col.dataset.columnaId;
      const columna = state.columnas.find((c) => c.id === columnaId);
      if (columna) columna.anchoPx = width;
      pizarraApi.updateColumnaAncho(columnaId, width).catch((err) => console.error(err));
    };
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  });
}

// Desplazar el tablero completo con el mouse (boton izquierdo apretado)
// cuando las columnas ensanchadas superan el ancho de la pantalla. El
// scroll con teclado (flechas) ya lo da gratis el navegador gracias al
// tabindex="0" del contenedor — no hace falta JS para eso.
function wireKanbanPanScroll() {
  const board = els.agendaKanban;
  let dragging = false;
  let startX = 0, startScrollLeft = 0;

  board.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest(".kcard, .col-resize-handle, button, a, input, textarea, select")) return;
    dragging = true;
    startX = e.clientX;
    startScrollLeft = board.scrollLeft;
    board.classList.add("panning");
    board.setPointerCapture(e.pointerId);
  });
  board.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    board.scrollLeft = startScrollLeft - (e.clientX - startX);
  });
  const stopPan = () => { dragging = false; board.classList.remove("panning"); };
  board.addEventListener("pointerup", stopPan);
  board.addEventListener("pointercancel", stopPan);
}

// Sistema de iconos de marca — ver design/notby-manual-de-marca.html, seccion
// 04 (Iconografia). Geometria tomada 1:1 del manual donde existe un icono
// equivalente; el resto (correo, maletin, llave) se autoro en el mismo
// lenguaje visual (grid 24x24, trazo 1.75, cabos/uniones redondeados) porque
// el manual no los cubre explicitamente. Reemplaza los emojis/glifos unicode
// que se usaban antes como iconos ad hoc.
const ICONS = {
  candado: `<rect x="5" y="11" width="14" height="9.5" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>`,
  papelera: `<path d="M4.5 7h15"/><path d="M6.5 7l1 12.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1L17.5 7"/><path d="M9.5 7V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7"/><path d="M10.2 11v6M13.8 11v6"/>`,
  lapiz: `<path d="M4 20l.9-4 10-10 3.1 3.1-10 10-4 .9z"/><path d="M13.5 6.5l3.1 3.1"/>`,
  enlace: `<path d="M9.5 14.5l5-5"/><path d="M8 16l-1.5 1.5a3.2 3.2 0 0 1-4.5-4.5L4 11"/><path d="M16 8l1.5-1.5a3.2 3.2 0 0 1 4.5 4.5L20 13"/>`,
  comentario: `<path d="M4 5.5h16A1.5 1.5 0 0 1 21.5 7v8A1.5 1.5 0 0 1 20 16.5H9l-4.2 3.3a.5.5 0 0 1-.8-.4V16.5H4A1.5 1.5 0 0 1 2.5 15V7A1.5 1.5 0 0 1 4 5.5z"/>`,
  documento: `<path d="M6 3h7l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M13 3v4h4"/><path d="M8 12h8M8 15.5h8M8 9h3"/>`,
  alerta: `<path d="M12 3.5 21.3 20H2.7z"/><path d="M12 10v4"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7"/>`,
  circulo: `<circle cx="12" cy="12" r="8"/>`,
  cerrar: `<path d="M6 6l12 12M18 6L6 18"/>`,
  masOpciones: `<circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none"/>`,
  predecesor: `<path d="M6 6v6a2 2 0 0 0 2 2h9"/><path d="M13.5 11l3.5 3-3.5 3"/>`,
  espera: `<path d="M7 3h10M7 21h10"/><path d="M8 3c0 3.3 2.6 4.7 4 6-1.4 1.3-4 2.7-4 6M16 3c0 3.3-2.6 4.7-4 6 1.4 1.3 4 2.7 4 6"/>`,
  usuario: `<circle cx="12" cy="8.2" r="3.7"/><path d="M4.5 20.5c0-4.14 3.36-7 7.5-7s7.5 2.86 7.5 7"/>`,
  carpeta: `<path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2.2h8a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-11z"/>`,
  conectado: `<path d="M10 10V5.5M14 10V5.5"/><rect x="7" y="10" width="10" height="7.5" rx="2.5"/><path d="M12 17.5v3"/>`,
  adjunto: `<path d="M16.5 6.5l-7.8 7.8a3 3 0 1 0 4.24 4.24l7.4-7.4a5 5 0 1 0-7.07-7.07L5.5 11.83a7 7 0 1 0 9.9 9.9"/>`,
  reordenar: `<circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none"/>`,
  chevronAbajo: `<path d="M6 9l6 6 6-6"/>`,
  ajustes: `<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4L5.6 5.6"/>`,
  lista: `<circle cx="5" cy="7" r="1" fill="currentColor" stroke="none"/><path d="M8.5 7h11.5"/><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><path d="M8.5 12h11.5"/><circle cx="5" cy="17" r="1" fill="currentColor" stroke="none"/><path d="M8.5 17h11.5"/>`,
  correo: `<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 6.5l8 6.5 8-6.5"/>`,
  maletin: `<rect x="3.5" y="8" width="17" height="11" rx="2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3.5 13h17"/>`,
  llave: `<circle cx="7.5" cy="15.5" r="3.5"/><path d="M10 13l8.5-8.5"/><path d="M15 8l2.5 2.5"/><path d="M17.5 5.5L20 8"/>`,
  campana: `<path d="M6 9.5a6 6 0 0 1 12 0c0 4.5 1.8 5.8 1.8 5.8H4.2S6 14 6 9.5z"/><path d="M10 18.5a2 2 0 0 0 4 0"/>`,
  buscar: `<circle cx="10.5" cy="10.5" r="6.5"/><path d="M19.5 19.5l-4.3-4.3"/>`,
  // Colaboracion y roles (manual): pizarra personal reutiliza "usuario".
  pizarraColaborativa: `<circle cx="8.5" cy="8.5" r="3"/><circle cx="16" cy="9.5" r="2.4"/><path d="M3.5 20c0-3.6 2.6-5.8 5-5.8s5 2.2 5 5.8"/><path d="M14.3 14.7c2 .3 3.7 2.1 3.7 5.3"/>`,
  invitar: `<circle cx="10" cy="8.2" r="3.7"/><path d="M3.5 20.5c0-4.14 2.9-7 6.5-7"/><path d="M17 8.5v6M14 11.5h6"/>`,
  // Navegacion nucleo (manual, 04 — Iconografia): Hitos y Alertas reutilizan
  // Prioridad y Notificacion (campana, ya definida arriba); Expedientes
  // reutiliza "documento" (identico al icono "Expediente" del manual).
  dashboardGrid: `<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="2"/><rect x="13" y="13" width="7.5" height="7.5" rx="2"/>`,
  temasBarras: `<rect x="3.5" y="4.5" width="4.5" height="15" rx="2"/><rect x="9.75" y="4.5" width="4.5" height="10" rx="2"/><rect x="16" y="4.5" width="4.5" height="13" rx="2"/>`,
  prioridad: `<path d="M6 21V4"/><path d="M6 4.5h10.5a1 1 0 0 1 .8 1.6l-2.6 3.4 2.6 3.4a1 1 0 0 1-.8 1.6H6"/>`,
  calendario: `<rect x="3.5" y="5" width="17" height="15.5" rx="4"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/>`,
  // Rediseno de la ventana de detalle (mockup notby-tarea v2.5): iconos nuevos
  // copiados verbatim del mockup aprobado, el resto de esa pantalla reusa
  // iconos ya existentes arriba (lista, prioridad, comentario, candado,
  // predecesor, espera, enlace).
  candadoAbierto: `<rect x="5" y="11" width="14" height="9.5" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 7-2.4"/>`,
  rayo: `<path d="M13 3L5.5 13H11l-1 8 8-10h-5.5l.5-8z"/>`,
  listaNumerada: `<path d="M8.5 6h11.5M8.5 12h11.5M8.5 18h11.5"/><path d="M4 5v3M4 5h-.7M4 8h1"/><path d="M3.3 12.3h1.3v1.2h-1.3M3.3 12.3a.9.9 0 0 1 1.6-.6c.3.4.2.7-.2 1.1l-1.4 1.4h1.7"/><path d="M3.3 17.3h1.3M4.6 17.3v3M3.3 20.3h2"/>`,
  ganttBarras: `<rect x="3.5" y="5" width="10" height="3" rx="1.5"/><rect x="7.5" y="10.5" width="13" height="3" rx="1.5"/><rect x="4.5" y="16" width="8" height="3" rx="1.5"/>`,
  historial: `<path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4"/><path d="M4.5 5.5v4h4"/><path d="M12 8.5v3.8l2.6 1.6"/>`,
  imagen: `<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M4 16.3l4.5-4.8 3.2 3.6 3-3.3L20.5 17"/>`,
  descargar: `<path d="M12 3.5v11.5"/><path d="M7.5 11l4.5 4.5 4.5-4.5"/><path d="M4.5 17.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2"/>`,
  // Icono de cursiva para el toolbar de Quill (ver Object.assign(Quill.import("ui/icons"))
  // mas abajo): reemplaza la "I" en texto italico, que a ese tamano se ve
  // como una simple linea inclinada y no se reconoce como boton de cursiva.
  cursiva: `<line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>`
};
function icon(name, size = 16) {
  return `<svg class="icon-inline" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}
// El toolbar de Quill (composer de comentarios) trae sus propios SVG por
// defecto. Theme.buildButtons pisa el innerHTML de cada <button class="ql-*">
// con esta tabla apenas se instancia el Quill (sea el toolbar auto-generado
// o, como ahora, un contenedor propio pasado en modules.toolbar.container)
// — cualquier contenido que le pongamos a mano en el HTML del boton se
// pierde igual, asi que el reemplazo tiene que vivir aca. Mapea 1:1 al
// trazo del manual de marca / mockup v2.5, compartido por los dos Quill de
// comentarios (composer nuevo y edicion in-place).
const qlIconSvg = (name, size = 15) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
Object.assign(Quill.import("ui/icons"), {
  image: qlIconSvg("imagen"),
  link: qlIconSvg("enlace"),
  bold: "B",
  italic: qlIconSvg("cursiva"),
  list: { ordered: qlIconSvg("listaNumerada", 14), bullet: qlIconSvg("lista", 14) },
});

// Handler propio del boton "Enlace" de los dos Quill de comentarios (composer
// y edicion in-place): el handler default de Quill/SnowTheme no hace nada si
// no hay texto seleccionado (corta en seco con "if (range.length === 0)
// return"), lo que en este toolbar compacto se sentia como un boton roto.
// Con seleccion, formatea ese texto como enlace; sin seleccion, inserta la
// URL como texto propio ya formateado en la posicion del cursor.
function quillLinkHandler(value) {
  if (!value) { this.quill.format("link", false, Quill.sources.USER); return; }
  const range = this.quill.getSelection(true);
  if (!range) return;
  const url = window.prompt("Ingresá la URL del enlace:");
  if (!url) return;
  const href = /^\S+@\S+\.\S+$/.test(url) ? `mailto:${url}` : (/^\w+:\/\//.test(url) ? url : `https://${url}`);
  if (range.length === 0) {
    this.quill.insertText(range.index, url, "link", href, Quill.sources.USER);
    this.quill.setSelection(range.index + url.length, 0, Quill.sources.USER);
  } else {
    this.quill.formatText(range.index, range.length, "link", href, Quill.sources.USER);
  }
}

// --------- Menu de acciones de la tarjeta Kanban (boton "⋯") ---------
let activeKcardMenu = null;

const KMENU_ICONS = {
  editar: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`,
  persona: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  reloj: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  etiqueta: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  copiar: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  reporte: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
  columnas: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="7" rx="1"/></svg>`,
};

function closeKcardMenu() {
  if (!activeKcardMenu) return;
  const { overlay, menu, btn, onKeydown } = activeKcardMenu;
  overlay.remove();
  menu.remove();
  btn.classList.remove("open");
  document.removeEventListener("keydown", onKeydown);
  activeKcardMenu = null;
}

function openKcardMenu(btn, temaId) {
  closeKcardMenu();
  const tema = state.temas.find((t) => t.id === temaId);
  if (!tema) return;

  const items = [{ action: "abrir", ico: "editar", label: "Editar tema" }];
  if (puedeEditar()) {
    items.push(
      { action: "responsable", ico: "persona", label: "Asignar responsable" },
      { action: "fechas", ico: "reloj", label: "Editar fechas" },
      { action: "etiquetas", ico: "etiqueta", label: "Etiquetas" },
      { action: "copiar", ico: "copiar", label: "Copiar tarjeta" }
    );
  }

  const overlay = document.createElement("div");
  overlay.className = "kcard-menu-overlay";
  const menu = document.createElement("div");
  menu.className = "kcard-menu";
  menu.innerHTML = items.map((it) => `
    <button type="button" class="kcard-menu-item" data-kmenu-action="${it.action}">
      <span class="kcard-menu-ico">${KMENU_ICONS[it.ico]}</span>${it.label}
    </button>`).join("");

  document.body.appendChild(overlay);
  document.body.appendChild(menu);
  btn.classList.add("open");

  const btnRect = btn.getBoundingClientRect();
  menu.style.top = `${btnRect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - btnRect.right}px`;

  const onKeydown = (e) => { if (e.key === "Escape") closeKcardMenu(); };
  document.addEventListener("keydown", onKeydown);
  overlay.addEventListener("click", closeKcardMenu);
  menu.querySelectorAll("[data-kmenu-action]").forEach((item) => {
    item.addEventListener("click", () => {
      const action = item.dataset.kmenuAction;
      closeKcardMenu();
      handleKcardMenuAction(action, tema);
    });
  });

  activeKcardMenu = { overlay, menu, btn, onKeydown };
}

function handleKcardMenuAction(action, tema) {
  switch (action) {
    case "abrir":
      openTemaForm(tema, undefined, { mode: "edit" });
      break;
    case "responsable":
      openTemaForm(tema, undefined, { mode: "edit" });
      requestAnimationFrame(() => {
        const trigger = els.taskForm.querySelector(".resp-dropdown-trigger");
        trigger?.scrollIntoView({ block: "center" });
        trigger?.click();
      });
      break;
    case "fechas":
      openTemaForm(tema, undefined, { mode: "edit" });
      requestAnimationFrame(() => {
        const input = document.getElementById("taskFechaLimiteInput");
        input?.scrollIntoView({ block: "center" });
        input?.focus();
      });
      break;
    case "etiquetas":
      openTemaForm(tema, undefined, { mode: "edit" });
      requestAnimationFrame(() => {
        const addBtn = document.getElementById("taskEtiquetaAddBtn");
        addBtn?.scrollIntoView({ block: "center" });
        addBtn?.click();
      });
      break;
    case "copiar":
      duplicarTema(tema);
      break;
  }
}

async function duplicarTema(tema) {
  if (!puedeEditar()) return;
  const nuevoId = await nextTemaId();
  const draft = {
    id: nuevoId,
    nombre: `${tema.nombre} (copia)`,
    solicitante: tema.solicitante || "",
    etiquetas: (tema.etiquetas || []).map((et) => ({ ...et })),
    prioridad: tema.prioridad || "Media",
    responsable: tema.responsable,
    columnaId: tema.columnaId,
    estado: tema.estado,
    esInicial: tema.esInicial,
    esFinal: tema.esFinal,
    expediente: tema.expediente || "",
    gde: tema.gde || "",
    fechaInicio: fmtDate(new Date()),
    fechaLimite: tema.fechaLimite,
    fechaCierre: tema.estado === "Cerrado" ? fmtDate(new Date()) : "",
    descripcion: tema.descripcion || "",
    privado: tema.privado || false,
    hitos: [], comentarios: [], documentos: [],
    historial: [{ event: `Tema creado (copia de ${tema.id})`, at: fmtDate(new Date()), by: activeUserName() }],
    ultimaActualizacion: fmtDate(new Date()),
    creadoPor: activeUserId(),
    __persisted: false
  };
  const ok = await withBusy(async () => {
    await dataApi.createTema(draft);
    await dataApi.logActivity(draft.id, `Tema creado como copia de ${tema.id}`);
    await reloadState();
  });
  if (ok) showToast(`Tarjeta copiada como ${nuevoId}`);
}

// (reorderColumn / setTemaEstado reemplazados por dataApi.reorderTemas /
//  dataApi.updateTemaColumna en el handler de drop del Kanban.)

// =========================================================
// Menu del tablero (boton "⋯" del tabbar): Etiquetas / Actividad
// =========================================================
let boardMenuView = "root"; // "root" | "etiquetas" | "editEtiqueta" | "actividad" | "columnas" | "editColumna"
let boardMenuEditing = null; // { id, nombre, color, nombreOriginal } mientras se edita/crea
let boardMenuEtiquetaFiltro = "";
let actividadWindowCount = 1; // cuantos bloques de 72hs se muestran

function openBoardMenu() {
  boardMenuView = "root";
  els.boardMenu.classList.remove("hidden");
  els.boardMenuOverlay.classList.remove("hidden");
  renderBoardMenu();
}

function closeBoardMenu() {
  els.boardMenu.classList.add("hidden");
  els.boardMenuOverlay.classList.add("hidden");
  boardMenuView = "root";
  boardMenuEditing = null;
  boardMenuEditingColumna = null;
  boardMenuEtiquetaFiltro = "";
  actividadWindowCount = 1;
}

function boardMenuGoBack() {
  boardMenuView = boardMenuView === "editEtiqueta" ? "etiquetas"
    : boardMenuView === "editColumna" ? "columnas"
    : "root";
  renderBoardMenu();
}

function renderBoardMenu() {
  els.boardMenuBack.classList.toggle("hidden", boardMenuView === "root");
  if (boardMenuView === "etiquetas") renderBoardMenuEtiquetas();
  else if (boardMenuView === "editEtiqueta") renderBoardMenuEditEtiqueta();
  else if (boardMenuView === "actividad") renderBoardMenuActividad();
  else if (boardMenuView === "columnas") renderBoardMenuColumnas();
  else if (boardMenuView === "editColumna") renderBoardMenuEditColumna();
  else renderBoardMenuRoot();
}

function renderBoardMenuRoot() {
  els.boardMenuTitle.textContent = "Menú";
  els.boardMenuBody.innerHTML = `
    <button type="button" class="board-menu-item" data-board-nav="etiquetas">
      <span class="board-menu-item-ico">${KMENU_ICONS.etiqueta}</span>Etiquetas
    </button>
    <button type="button" class="board-menu-item" data-board-nav="actividad">
      <span class="board-menu-item-ico">${KMENU_ICONS.reloj}</span>Actividad
    </button>
    ${puedeEditar() ? `<button type="button" class="board-menu-item" data-board-nav="columnas">
      <span class="board-menu-item-ico">${KMENU_ICONS.columnas}</span>Columnas
    </button>` : ""}
    <div class="board-menu-sep"></div>
    <button type="button" class="board-menu-item" data-board-goto="reportes">
      <span class="board-menu-item-ico">${KMENU_ICONS.reporte}</span>Reportes
    </button>
    <button type="button" class="board-menu-item" data-board-goto="responsables">
      <span class="board-menu-item-ico">${KMENU_ICONS.persona}</span>Responsables
    </button>
  `;
  els.boardMenuBody.querySelectorAll("[data-board-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      boardMenuView = btn.dataset.boardNav;
      if (boardMenuView === "actividad") actividadWindowCount = 1;
      if (boardMenuView === "etiquetas") boardMenuEtiquetaFiltro = "";
      renderBoardMenu();
    });
  });
  els.boardMenuBody.querySelectorAll("[data-board-goto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeBoardMenu();
      navigateTo(btn.dataset.boardGoto);
    });
  });
}

// ---------------- Columnas: gestion (fase 2) ----------------
let boardMenuEditingColumna = null; // { id, nombre, color, isFixed, isNew }

function renderBoardMenuColumnas() {
  els.boardMenuTitle.textContent = "Columnas";
  const cols = state.columnas.slice().sort((a, b) => a.orden - b.orden);
  const editable = puedeEditar();

  els.boardMenuBody.innerHTML = `
    <div class="board-menu-section-title">Columnas de la pizarra</div>
    <div class="board-label-list">
      ${cols.map((c, idx) => {
        const count = state.temas.filter((t) => t.columnaId === c.id).length;
        const isFixed = c.esInicial || c.esFinal;
        const canUp = idx > 1;
        const canDown = idx < cols.length - 2;
        return `
        <div class="board-label-row" data-columna-row="${c.id}">
          <span class="board-label-badge" style="background:${columnaColorHex(c.color)};color:#fff">
            ${escHtml(c.nombre)}${isFixed ? ` · ${c.esInicial ? "Inicial" : "Final"}` : ""}
          </span>
          <span style="display:flex;gap:2px;align-items:center">
            ${editable && !isFixed ? `
              <button type="button" class="board-label-edit" data-col-up="${c.id}" ${canUp ? "" : "disabled"} title="Subir">↑</button>
              <button type="button" class="board-label-edit" data-col-down="${c.id}" ${canDown ? "" : "disabled"} title="Bajar">↓</button>
            ` : ""}
            ${editable ? `<button type="button" class="board-label-edit" data-col-edit="${c.id}" aria-label="Editar columna" title="Editar nombre y color">${KMENU_ICONS.editar}</button>` : ""}
            ${editable && !isFixed ? `<button type="button" class="board-label-edit" data-col-delete="${c.id}" ${count ? "disabled" : ""} aria-label="Eliminar columna" title="${count ? `Vacia la columna primero (${count} temas)` : "Eliminar columna"}">${icon("papelera", 14)}</button>` : ""}
          </span>
        </div>`;
      }).join("")}
    </div>
    ${editable ? `<button type="button" class="board-menu-item board-menu-create" id="boardColumnaCrear">+ Agregar columna</button>` : ""}
  `;

  els.boardMenuBody.querySelectorAll("[data-col-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const col = cols.find((c) => c.id === btn.dataset.colEdit);
      openEditColumna(col);
    });
  });

  els.boardMenuBody.querySelectorAll("[data-col-delete]:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const col = cols.find((c) => c.id === btn.dataset.colDelete);
      if (!confirm(`Eliminar la columna "${col.nombre}"?`)) return;
      const ok = await withBusy(async () => {
        await pizarraApi.deleteColumna(col.id);
        await reloadState(state.currentPizarraId);
      });
      if (ok) { boardMenuView = "columnas"; renderBoardMenu(); showToast("Columna eliminada"); }
    });
  });

  els.boardMenuBody.querySelectorAll("[data-col-up]:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => moverColumna(btn.dataset.colUp, -1, cols));
  });
  els.boardMenuBody.querySelectorAll("[data-col-down]:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => moverColumna(btn.dataset.colDown, 1, cols));
  });

  document.getElementById("boardColumnaCrear")?.addEventListener("click", () => openEditColumna(null));
}

function openEditColumna(col) {
  boardMenuEditingColumna = col
    ? { id: col.id, nombre: col.nombre, color: col.color || "warm-gray", isFixed: col.esInicial || col.esFinal, isNew: false }
    : { id: null, nombre: "", color: "warm-gray", isFixed: false, isNew: true };
  boardMenuView = "editColumna";
  renderBoardMenu();
}

function renderBoardMenuEditColumna() {
  const draft = boardMenuEditingColumna;
  els.boardMenuTitle.textContent = draft.isNew ? "Nueva columna" : "Editar columna";

  els.boardMenuBody.innerHTML = `
    <div class="board-label-preview" id="boardColumnaPreview" style="background:${columnaColorHex(draft.color)}">${escHtml(draft.nombre) || "Columna"}</div>
    <label class="board-menu-field-label" for="boardColumnaNombre">Nombre</label>
    <input type="text" class="board-menu-input" id="boardColumnaNombre" value="${escHtml(draft.nombre)}" placeholder="Nombre de la columna" />
    <div class="board-menu-field-label">Color</div>
    <div id="boardColumnaColorGrid">${columnaColorGridHtml(draft.color)}</div>
    <button type="button" class="primary board-menu-save" id="boardColumnaGuardar">Guardar</button>
  `;

  const nombreInput = document.getElementById("boardColumnaNombre");
  const preview = document.getElementById("boardColumnaPreview");
  nombreInput.addEventListener("input", () => {
    draft.nombre = nombreInput.value;
    preview.textContent = draft.nombre || "Columna";
  });
  nombreInput.focus();

  document.getElementById("boardColumnaColorGrid").querySelectorAll("[data-columna-color]").forEach((tile) => {
    tile.addEventListener("click", () => {
      draft.color = tile.dataset.columnaColor;
      renderBoardMenuEditColumna();
    });
  });

  document.getElementById("boardColumnaGuardar").addEventListener("click", async () => {
    const nombre = nombreInput.value.trim();
    if (!nombre) { showToast("El nombre de la columna es requerido"); return; }
    const ok = await withBusy(async () => {
      if (draft.isNew) {
        await pizarraApi.addColumnaIntermedia(state.currentPizarraId, nombre, draft.color);
      } else {
        await pizarraApi.updateColumna(draft.id, { nombre, color: draft.color });
      }
      await reloadState(state.currentPizarraId);
    });
    if (ok) {
      boardMenuView = "columnas";
      boardMenuEditingColumna = null;
      renderBoardMenu();
      showToast(draft.isNew ? "Columna creada" : "Columna actualizada");
    }
  });
}

// Reordena dos columnas intermedias adyacentes (nunca cruza la inicial/final).
async function moverColumna(id, delta, cols) {
  const idx = cols.findIndex((c) => c.id === id);
  const targetIdx = idx + delta;
  if (targetIdx < 0 || targetIdx >= cols.length) return;
  if (cols[targetIdx].esInicial || cols[targetIdx].esFinal) return;
  const reordered = cols.slice();
  [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
  const ok = await withBusy(async () => {
    await pizarraApi.reorderColumnas(state.currentPizarraId, reordered.map((c) => c.id));
    await reloadState(state.currentPizarraId);
  });
  if (ok) { boardMenuView = "columnas"; renderBoardMenu(); }
}

// ---------------- Etiquetas: lista ----------------
function renderBoardMenuEtiquetas() {
  els.boardMenuTitle.textContent = "Etiquetas";
  const q = boardMenuEtiquetaFiltro.trim().toLowerCase();
  const lista = (state.etiquetas || []).filter((e) => !q || e.nombre.toLowerCase().includes(q));

  els.boardMenuBody.innerHTML = `
    <input type="text" class="board-menu-search" id="boardEtiquetaSearch" placeholder="Buscar etiquetas..." value="${escHtml(boardMenuEtiquetaFiltro)}" />
    <div class="board-menu-section-title">Etiquetas</div>
    <div class="board-label-list">
      ${lista.length ? lista.map((e) => {
        const { bg, text } = resolveTagColor(e.color);
        return `
        <div class="board-label-row" data-label-id="${e.id}">
          <span class="board-label-badge" style="background:${bg};color:${text}">${escHtml(e.nombre)}</span>
          ${puedeEditar() ? `<button type="button" class="board-label-edit" data-label-edit="${e.id}" aria-label="Editar etiqueta" title="Editar etiqueta">${KMENU_ICONS.editar}</button>` : ""}
        </div>`;
      }).join("") : `<p class="board-menu-empty">Sin etiquetas.</p>`}
    </div>
    ${puedeEditar() ? `<button type="button" class="board-menu-item board-menu-create" id="boardEtiquetaCrear">+ Crear una etiqueta nueva</button>` : ""}
  `;

  const searchInput = document.getElementById("boardEtiquetaSearch");
  searchInput.addEventListener("input", () => {
    boardMenuEtiquetaFiltro = searchInput.value;
    renderBoardMenuEtiquetas();
    const el = document.getElementById("boardEtiquetaSearch");
    el.focus();
    el.selectionStart = el.selectionEnd = el.value.length;
  });

  els.boardMenuBody.querySelectorAll("[data-label-edit]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openEditEtiqueta(state.etiquetas.find((x) => x.id === btn.dataset.labelEdit) || null);
    });
  });
  if (puedeEditar()) {
    els.boardMenuBody.querySelectorAll("[data-label-id]").forEach((row) => {
      row.addEventListener("click", () => {
        openEditEtiqueta(state.etiquetas.find((x) => x.id === row.dataset.labelId) || null);
      });
    });
  }
  document.getElementById("boardEtiquetaCrear")?.addEventListener("click", () => openEditEtiqueta(null));
}

// ---------------- Etiquetas: crear / editar ----------------
function openEditEtiqueta(et) {
  boardMenuEditing = et
    ? { id: et.id, nombre: et.nombre, color: et.color, nombreOriginal: et.nombre }
    : { id: null, nombre: "", color: TAG_COLORS[0].name, nombreOriginal: null };
  boardMenuView = "editEtiqueta";
  renderBoardMenu();
}

function renderBoardMenuEditEtiqueta() {
  const draft = boardMenuEditing;
  const isEdit = Boolean(draft.id);
  els.boardMenuTitle.textContent = isEdit ? "Editar etiqueta" : "Nueva etiqueta";
  const preview0 = resolveTagColor(draft.color);

  els.boardMenuBody.innerHTML = `
    <div class="board-label-preview" id="boardLabelPreview" style="background:${preview0.bg};color:${preview0.text}">${escHtml(draft.nombre) || "Etiqueta"}</div>
    <label class="board-menu-field-label" for="boardEtiquetaNombre">Título</label>
    <input type="text" class="board-menu-input" id="boardEtiquetaNombre" value="${escHtml(draft.nombre)}" placeholder="Nombre de la etiqueta" />
    <div class="board-menu-field-label">Seleccionar un color</div>
    <div id="boardColorGrid">${tagColorGridHtml(resolveTagColor(draft.color).name)}</div>
    <button type="button" class="primary board-menu-save" id="boardEtiquetaGuardar">Guardar</button>
    ${isEdit && canDelete() ? `<button type="button" class="board-menu-delete" id="boardEtiquetaEliminar">Eliminar</button>` : ""}
  `;

  const nombreInput = document.getElementById("boardEtiquetaNombre");
  const preview = document.getElementById("boardLabelPreview");
  nombreInput.addEventListener("input", () => {
    draft.nombre = nombreInput.value;
    preview.textContent = draft.nombre || "Etiqueta";
  });
  nombreInput.focus();

  document.getElementById("boardColorGrid").querySelectorAll("[data-tag-color]").forEach((tile) => {
    tile.addEventListener("click", () => {
      draft.color = tile.dataset.tagColor;
      renderBoardMenuEditEtiqueta();
    });
  });

  document.getElementById("boardEtiquetaGuardar").addEventListener("click", async () => {
    const nombre = nombreInput.value.trim();
    if (!nombre) { showToast("El nombre de la etiqueta es requerido"); return; }
    const ok = await withBusy(async () => {
      if (isEdit) await guardarEdicionEtiqueta(draft.id, draft.nombreOriginal, nombre, draft.color);
      else {
        const creada = await dataApi.createEtiqueta({ nombre, color: draft.color, orden: state.etiquetas.length });
        state.etiquetas.push(creada);
      }
      await reloadState();
    });
    if (ok) {
      boardMenuView = "etiquetas";
      boardMenuEditing = null;
      renderBoardMenu();
      showToast(isEdit ? "Etiqueta actualizada" : "Etiqueta creada");
    }
  });

  document.getElementById("boardEtiquetaEliminar")?.addEventListener("click", async () => {
    if (!confirm(`Eliminar la etiqueta "${draft.nombre}"? Se quitará de todos los temas que la usan.`)) return;
    const ok = await withBusy(async () => {
      await eliminarEtiquetaCascada(draft.id, draft.nombreOriginal);
      await reloadState();
    });
    if (ok) {
      boardMenuView = "etiquetas";
      boardMenuEditing = null;
      renderBoardMenu();
      showToast("Etiqueta eliminada");
    }
  });
}

// Renombrar/recolorear una etiqueta del catalogo se propaga a los temas que la usan
// (temas.etiquetas es una copia embebida, ver 006/007 en supabase/migrations).
async function guardarEdicionEtiqueta(id, nombreOriginal, nuevoNombre, nuevoColor) {
  await dataApi.updateEtiqueta(id, { nombre: nuevoNombre, color: nuevoColor });
  const afectados = state.temas.filter((t) => (t.etiquetas || []).some((et) => et.nombre === nombreOriginal));
  await Promise.all(afectados.map((t) => dataApi.updateTema(t.id, {
    ...t,
    etiquetas: t.etiquetas.map((et) => et.nombre === nombreOriginal ? { nombre: nuevoNombre, color: nuevoColor } : et)
  })));
}

async function eliminarEtiquetaCascada(id, nombre) {
  const afectados = state.temas.filter((t) => (t.etiquetas || []).some((et) => et.nombre === nombre));
  await Promise.all(afectados.map((t) => dataApi.updateTema(t.id, {
    ...t,
    etiquetas: t.etiquetas.filter((et) => et.nombre !== nombre)
  })));
  await dataApi.deleteEtiqueta(id);
}

// ---------------- Actividad: ultimas 72hs, con "cargar mas" ----------------
function getAllActivityEvents() {
  return state.temas.flatMap((t) =>
    (t.historial || []).map((h) => ({ ...h, temaId: t.id, temaNombre: t.nombre }))
  ).sort((a, b) => (b.createdAt || b.at || "").localeCompare(a.createdAt || a.at || ""));
}

function initialsOf(name) {
  return String(name || "?").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function renderBoardMenuActividad() {
  els.boardMenuTitle.textContent = "Actividad";
  const all = getAllActivityEvents();
  const visibleCountAt = (n) => {
    const cutoff = Date.now() - n * 72 * 3600 * 1000;
    return all.filter((ev) => !ev.createdAt || new Date(ev.createdAt).getTime() >= cutoff).length;
  };
  const visible = all.slice(0, visibleCountAt(actividadWindowCount));
  const hayMas = visible.length < all.length;

  els.boardMenuBody.innerHTML = `
    <div class="board-activity-list">
      ${visible.length ? visible.map((ev) => `
        <div class="board-activity-row" data-tema="${ev.temaId}">
          <div class="board-activity-avatar">${escHtml(initialsOf(ev.by))}</div>
          <div class="board-activity-content">
            <div class="board-activity-text"><strong>${escHtml(ev.by || "sistema")}</strong> ${escHtml(ev.event)} <span class="board-activity-tema">→ ${escHtml(ev.temaNombre)}</span></div>
            <div class="board-activity-date">${ev.createdAt ? fmtDateTimeNice(ev.createdAt) : fmtDateNice(ev.at)}</div>
          </div>
        </div>`).join("") : `<p class="board-menu-empty">Sin actividad en las últimas 72 horas.</p>`}
    </div>
    ${hayMas ? `<button type="button" class="board-menu-item board-menu-create" id="boardActividadMas">Cargar más actividad</button>` : ""}
  `;

  els.boardMenuBody.querySelectorAll("[data-tema]").forEach((row) => {
    row.addEventListener("click", () => { closeBoardMenu(); openTemaFormById(row.dataset.tema); });
  });
  document.getElementById("boardActividadMas")?.addEventListener("click", () => {
    // Avanza de a bloques de 72hs, pero si un bloque no trae nada nuevo
    // (hueco en el historial) sigue avanzando hasta encontrar el siguiente
    // con actividad, para que el click siempre muestre un cambio.
    const before = visible.length;
    let n = actividadWindowCount;
    do { n += 1; } while (visibleCountAt(n) === before && visibleCountAt(n) < all.length);
    actividadWindowCount = n;
    renderBoardMenuActividad();
  });
}

// =========================================================
// HITOS (tabla global, todos los hitos de todos los temas)
// =========================================================
function renderHitos() {
  const allHitos = state.temas.filter(isTemaVisible).flatMap((t) =>
    t.hitos.map((h) => ({
      ...h,
      temaId: t.id,
      temaNombre: t.nombre,
      expediente: h.expediente || t.expediente,
      temaPrioridad: t.prioridad,
      temaEtiquetas: t.etiquetas || []
    }))
  );
  const filtered = allHitos.filter((h) => {
    if (showMisHitosOnly && !(h.responsable || "").includes(activeUserName())) return false;
    if (els.fHResponsable.value && h.responsable !== els.fHResponsable.value) return false;
    if (els.fHEstado.value && h.estado !== els.fHEstado.value) return false;
    if (els.fHPrioridad.value && h.temaPrioridad !== els.fHPrioridad.value) return false;
    if (els.fHEtiqueta.value && !h.temaEtiquetas.some((e) => e.nombre === els.fHEtiqueta.value)) return false;
    return true;
  });
  const rows = sortTableData(filtered, "tableHitos");
  els.tableHitos.innerHTML = rows.length ? rows.map((h) => `
    <tr class="clickable-row" data-tema="${h.temaId}" title="Clic para abrir el tema">
      <td class="mono">${h.id}</td>
      <td>${escHtml(h.nombre)}</td>
      <td>${escHtml(h.temaNombre)}</td>
      <td>${respDisplay(h.responsable)}</td>
      <td>${badge(h.estado)}</td>
      <td class="mono">${h.expediente || "-"}</td>
      <td>${fmtDateNice(h.fechaInicio)}</td>
      <td><span class="fecha-with-badge"><span>${fmtDateNice(h.fechaLimite)}</span>${diasRestantesBadge(h.fechaLimite, h.estado === "Cerrado" ? h.fechaCierre : null)}</span></td>
    </tr>`).join("") : `<tr><td colspan="8" style="color:var(--muted);text-align:center">Sin hitos.</td></tr>`;

  els.tableHitos.querySelectorAll("[data-tema]").forEach((row) =>
    row.addEventListener("click", () => openTemaFormById(row.dataset.tema, { activeTab: "general" }))
  );
}

// =========================================================
// CALENDARIO
// =========================================================
let calViewMode = "mes"; // "mes" | "3dias" | "semana-laboral" | "semana-completa"

function calendarDaysWindow() {
  const base = new Date(calCursor);
  base.setHours(0, 0, 0, 0);
  if (calViewMode === "3dias") {
    const d = new Date(base);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    const days = [];
    while (days.length < 3) {
      if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  }
  const dow = (base.getDay() + 6) % 7; // 0=lunes .. 6=domingo
  const monday = new Date(base);
  monday.setDate(base.getDate() - dow);
  const count = calViewMode === "semana-laboral" ? 5 : 7;
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function calendarTitle(days) {
  if (calViewMode === "mes") return calCursor.toLocaleDateString("es", { month: "long", year: "numeric" });
  const first = days[0], last = days[days.length - 1];
  const shortMonth = (d) => d.toLocaleDateString("es", { month: "short" });
  const sameMonth = first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear();
  return sameMonth
    ? `${first.getDate()} - ${last.getDate()} ${shortMonth(last)} ${last.getFullYear()}`
    : `${first.getDate()} ${shortMonth(first)} - ${last.getDate()} ${shortMonth(last)} ${last.getFullYear()}`;
}

function calGoToday() {
  calCursor = new Date();
  if (calViewMode === "mes") calCursor.setDate(1);
  renderCalendar();
}

function calStep(dir) {
  if (calViewMode === "mes") { calCursor.setMonth(calCursor.getMonth() + dir); calCursor.setDate(1); }
  else if (calViewMode === "3dias") calCursor.setDate(calCursor.getDate() + dir * 3);
  else calCursor.setDate(calCursor.getDate() + dir * 7);
  renderCalendar();
}

function renderCalendar() {
  const today = fmtDate(new Date());
  const events = collectCalendarEvents();

  if (calViewMode === "mes") {
    const year = calCursor.getFullYear();
    const month = calCursor.getMonth();
    els.calTitle.textContent = calendarTitle();
    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weekdays = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
    let html = weekdays.map((w) => `<div class="cal-weekday">${w}</div>`).join("");
    for (let i = 0; i < startWeekday; i++) html += dayCell(new Date(year, month, 1 - (startWeekday - i)), true, events, today, CAL_DAY_MAX_VISIBLE);
    for (let d = 1; d <= daysInMonth; d++) html += dayCell(new Date(year, month, d), false, events, today, CAL_DAY_MAX_VISIBLE);
    const fill = (7 - ((startWeekday + daysInMonth) % 7)) % 7;
    for (let i = 1; i <= fill; i++) html += dayCell(new Date(year, month + 1, i), true, events, today, CAL_DAY_MAX_VISIBLE);
    const weeks = (startWeekday + daysInMonth + fill) / 7;
    els.calGrid.style.gridTemplateColumns = "repeat(7, 1fr)";
    els.calGrid.style.gridTemplateRows = `auto repeat(${weeks}, 1fr)`;
    els.calGrid.innerHTML = html;
  } else {
    const days = calendarDaysWindow();
    els.calTitle.textContent = calendarTitle(days);
    const weekdayNames = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
    let html = days.map((d) => `<div class="cal-weekday">${weekdayNames[(d.getDay() + 6) % 7]}</div>`).join("");
    html += days.map((d) => dayCell(d, false, events, today, Infinity)).join("");
    els.calGrid.style.gridTemplateColumns = `repeat(${days.length}, 1fr)`;
    els.calGrid.style.gridTemplateRows = "auto 1fr";
    els.calGrid.innerHTML = html;
  }

  bindCalGrid(events);
}

function bindCalGrid(events) {
  els.calGrid.querySelectorAll("[data-tema]").forEach((n) =>
    n.addEventListener("click", () => openTemaFormById(n.dataset.tema))
  );
  let dragId = "";
  els.calGrid.querySelectorAll(".cal-event").forEach((ev) => ev.addEventListener("dragstart", () => { dragId = ev.dataset.tema; }));
  els.calGrid.querySelectorAll(".cal-day").forEach((day) => {
    day.addEventListener("dragover", (e) => e.preventDefault());
    day.addEventListener("drop", async () => {
      if (!dragId) return;
      const id = dragId; dragId = "";
      const nuevaFecha = day.dataset.date;
      await withBusy(async () => {
        await dataApi.setTemaFechaLimite(id, nuevaFecha);
        await dataApi.logActivity(id, "Fecha modificada por calendario");
        await reloadState();
      });
    });
  });
  els.calGrid.querySelectorAll("[data-cal-more]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openCalDayPopover(btn, btn.dataset.calMore, events);
    });
  });
}

// Popover "+X mas" de un dia del calendario (mes) — mismo patron que
// openKcardMenu/openBoardMenu: overlay + panel fijo, se desmontan al cerrar.
let activeCalDayPopover = null;

function closeCalDayPopover() {
  if (!activeCalDayPopover) return;
  const { overlay, panel, onKeydown } = activeCalDayPopover;
  overlay.remove();
  panel.remove();
  document.removeEventListener("keydown", onKeydown);
  activeCalDayPopover = null;
}

function openCalDayPopover(btn, date, events) {
  closeCalDayPopover();
  const dayEvents = events.filter((e) => e.fecha === date);
  const label = new Date(date + "T00:00:00").toLocaleDateString("es", { day: "numeric", month: "long" });

  const overlay = document.createElement("div");
  overlay.className = "cal-day-popover-overlay";
  const panel = document.createElement("div");
  panel.className = "cal-day-popover";
  panel.innerHTML = `
    <div class="cal-day-popover-head">${escHtml(label)}</div>
    <div class="cal-day-popover-list">${dayEvents.map((e) => calEventHtml(e, false)).join("")}</div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(panel);

  const btnRect = btn.getBoundingClientRect();
  const panelWidth = 240;
  const left = Math.min(btnRect.left, window.innerWidth - panelWidth - 12);
  panel.style.left = `${Math.max(12, left)}px`;

  // Se mide despues de insertar (respeta el max-height:320px real segun
  // cuantos eventos tenga el dia) para decidir si abre hacia abajo o, si no
  // entra en el espacio restante de la ventana, hacia arriba del boton.
  const panelHeight = panel.offsetHeight;
  const spaceBelow = window.innerHeight - btnRect.bottom;
  const openUpward = spaceBelow < panelHeight + 12 && btnRect.top - panelHeight - 12 > 0;
  panel.style.top = openUpward
    ? `${Math.max(12, btnRect.top - panelHeight - 4)}px`
    : `${Math.min(btnRect.bottom + 4, window.innerHeight - panelHeight - 12)}px`;

  const onKeydown = (e) => { if (e.key === "Escape") closeCalDayPopover(); };
  document.addEventListener("keydown", onKeydown);
  overlay.addEventListener("click", closeCalDayPopover);
  panel.querySelectorAll("[data-tema]").forEach((n) =>
    n.addEventListener("click", () => { closeCalDayPopover(); openTemaFormById(n.dataset.tema); })
  );

  activeCalDayPopover = { overlay, panel, onKeydown };
}

const CAL_DAY_MAX_VISIBLE = 3;

function calEventHtml(e, draggable) {
  return `<div class="cal-event ev-${(e.estado || "pendiente").toLowerCase().replace(/\s+/g,"-")}" ${draggable ? `draggable="true"` : ""} data-tema="${e.id}" title="${escHtml(e.nombre)}">${escHtml(e.nombre)}</div>`;
}

function dayCell(d, outside, events, todayStr, maxVisible) {
  const date = fmtDate(d);
  const dayEvents = events.filter((e) => e.fecha === date);
  const visible = dayEvents.slice(0, maxVisible);
  const extra = dayEvents.length - visible.length;
  return `
    <div class="cal-day ${outside ? "outside" : ""} ${date === todayStr ? "today" : ""}" data-date="${date}">
      <div class="day-num">${d.getDate()}</div>
      ${visible.map((e) => calEventHtml(e, true)).join("")}
      ${extra > 0 ? `<button type="button" class="cal-more" data-cal-more="${date}">+${extra} más</button>` : ""}
    </div>`;
}

function collectCalendarEvents() {
  const out = [];
  state.temas.filter(isTemaVisible).forEach((t) => {
    out.push({ id: t.id, nombre: t.nombre, fecha: t.fechaLimite, estado: t.estado });
    t.hitos.forEach((h) => out.push({ id: t.id, nombre: `${t.id}: ${h.nombre}`, fecha: h.fechaLimite, estado: h.estado }));
  });
  return out;
}

// =========================================================
// EXPEDIENTES
// =========================================================
// Temas e hitos (visibles) que referencian un expediente, con su estado propio.
// Los numeros de expediente se tipean a mano y varian en formato (guiones
// dobles, espacios sueltos). Se normalizan para poder emparejar el mismo
// expediente aunque este escrito distinto en el tema/hito y en el catalogo.
function normalizeExpNumero(s) {
  return String(s || "").trim().replace(/\s+/g, "").replace(/-+/g, "-").toUpperCase();
}

// Agrupa, por numero de expediente normalizado, los temas/hitos (visibles)
// que lo referencian directamente.
function collectExpedienteRefs() {
  const map = new Map();
  state.temas.filter(isTemaVisible).forEach((t) => {
    if (t.expediente) {
      const key = normalizeExpNumero(t.expediente);
      if (!map.has(key)) map.set(key, { display: t.expediente, refs: [] });
      map.get(key).refs.push({ type: "tema", tema: t, estado: t.estado });
    }
    (t.hitos || []).forEach((h) => {
      if (h.expediente) {
        const key = normalizeExpNumero(h.expediente);
        if (!map.has(key)) map.set(key, { display: h.expediente, refs: [] });
        map.get(key).refs.push({ type: "hito", tema: t, hito: h, estado: h.estado });
      }
    });
  });
  return map;
}

function renderExpedientes() {
  const refsMap = collectExpedienteRefs();
  const catalogByKey = new Map(state.expedientes.map((e) => [normalizeExpNumero(e.numero), e]));

  // Solo expedientes ligados a un tema o hito, con al menos un vinculo activo
  // (no Cerrado). Sin vinculo o todos Cerrado: no se muestran.
  const items = [...refsMap.entries()]
    .filter(([, { refs }]) => refs.some((r) => r.estado !== "Cerrado"))
    .map(([key, { display, refs }]) => {
      const cat = catalogByKey.get(key) || null;
      const activeRef = refs.find((r) => r.estado !== "Cerrado");
      const temaRel = activeRef.tema;
      const hitoRel = activeRef.type === "hito" ? activeRef.hito : null;
      return {
        key,
        numero: cat ? cat.numero : display,
        gde: cat ? cat.gde : "",
        temaAsociado: cat ? cat.temaAsociado : temaRel.nombre,
        responsable: (cat ? cat.responsable : (hitoRel ? hitoRel.responsable : temaRel.responsable)) || "",
        fechaInicio: cat ? cat.fechaInicio : (hitoRel ? hitoRel.fechaInicio : temaRel.fechaInicio),
        fechaLimite: cat ? cat.fechaLimite : (hitoRel ? hitoRel.fechaLimite : temaRel.fechaLimite),
        estado: cat ? cat.estado : activeRef.estado,
        catalog: cat,
        temaRel,
        hitoRel
      };
    });

  const rows = sortTableData(items, "tableExpedientes");
  els.tableExpedientes.innerHTML = rows.map((e) => {
    const hitoCell = e.hitoRel ? `<span title="${escHtml(e.hitoRel.nombre)}">${escHtml(e.hitoRel.nombre.slice(0, 30))}${e.hitoRel.nombre.length > 30 ? "…" : ""}</span>` : "-";
    const temaLink = `<a href="#" class="link" data-open-tema="${e.temaRel.id}">${escHtml(e.temaAsociado)}</a>`;
    return `
    <tr data-exp-key="${escHtml(e.key)}">
      <td>
        <span class="exp-numero-cell">
          ${escHtml(e.numero)}
          ${e.gde ? `<a href="#" class="gde-badge" data-gde-open="${escHtml(e.numero)}">GDE</a>` : ""}
        </span>
      </td>
      <td>${temaLink}</td>
      <td>${hitoCell}</td>
      <td>${respDisplay(e.responsable)}</td>
      <td>${fmtDateNice(e.fechaInicio)}</td>
      <td>${fmtDateNice(e.fechaLimite)}</td>
      <td>${e.estado}</td>
      <td>${e.catalog ? `<button class="ghost" data-exp-edit="${escHtml(e.catalog.numero)}">Editar</button>` : ""}</td>
    </tr>`;
  }).join("");

  els.tableExpedientes.querySelectorAll("[data-gde-open]").forEach((a) => {
    a.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); openGDE(a.dataset.gdeOpen); });
  });
  els.tableExpedientes.querySelectorAll("[data-open-tema]").forEach((a) => {
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const tema = state.temas.find((t) => t.id === a.dataset.openTema);
      if (tema) openTemaForm(tema, undefined, { mode: "edit" });
    });
  });
  els.tableExpedientes.querySelectorAll("[data-exp-key]").forEach((n) => {
    n.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-exp-edit]") || ev.target.closest("[data-gde-open]") || ev.target.closest("[data-open-tema]")) return;
      const entry = refsMap.get(n.dataset.expKey);
      if (!entry) return;
      const activeRef = entry.refs.find((r) => r.estado !== "Cerrado");
      if (!activeRef) return;
      if (activeRef.type === "hito") openHitoForm(activeRef.tema, activeRef.hito);
      else openTemaForm(activeRef.tema, undefined, { mode: "edit" });
    });
  });
  els.tableExpedientes.querySelectorAll("[data-exp-edit]").forEach((b) => {
    b.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const ex = state.expedientes.find((x) => x.numero === b.dataset.expEdit);
      if (ex) openExpedienteForm(ex);
    });
  });
}

// =========================================================
// ALERTAS
// =========================================================
// Nivel de alerta: se recalcula solo a partir de los dias restantes hasta el
// vencimiento (fecha_limite - hoy). No hay ajuste manual; si la fecha se
// pospone el nivel baja solo, si se acerca o vence sube solo.
function computeAlertLevel(fechaLimite) {
  const d = daysUntil(fechaLimite);
  if (d <= 0) return { n: 4, label: "Crítico" };
  if (d <= 7) return { n: 3, label: "Urgente" };
  if (d <= 15) return { n: 2, label: "Atención" };
  return { n: 1, label: "Normal" };
}

function buildAlerts(temas) {
  const out = [];
  const today = fmtDate(new Date());
  temas.forEach((t) => {
    if (t.estado === "Cerrado") return;
    const lvl = computeAlertLevel(t.fechaLimite);
    const base = { temaId: t.id, temaPadre: "", responsable: t.responsable, expediente: t.expediente, fechaLimite: t.fechaLimite, nivel: lvl.n, nivelLabel: lvl.label };
    // Nivel 1 (Normal) no requiere seguimiento: no genera fila de alerta.
    if (lvl.n >= 2) out.push({ ...base, tipo: "Vencimiento tema", tema: t.nombre });
    if (daysBetween(t.ultimaActualizacion, today) > 14) {
      out.push({ ...base, tipo: "Sin actividad", tema: `${t.nombre} (sin actualizar)` });
    }
    t.hitos.forEach((h) => {
      if (h.estado === "Cerrado") return;
      const hlvl = computeAlertLevel(h.fechaLimite);
      if (hlvl.n < 2) return;
      out.push({
        temaId: t.id, temaPadre: t.nombre, responsable: h.responsable, expediente: t.expediente,
        fechaLimite: h.fechaLimite, esHito: true, nivel: hlvl.n, nivelLabel: hlvl.label,
        tipo: "Vencimiento hito", tema: h.nombre
      });
    });
  });
  return out;
}

function renderAlertas() {
  const alerts = sortTableData(buildAlerts(getFilteredTemas()), "tableAlertas");
  els.tableAlertas.innerHTML = alerts.map((a) => `
    <tr class="clickable-row" data-tema="${a.temaId}" title="Clic para abrir y editar el tema">
      <td><span class="nivel-text nivel-${a.nivel}">${a.nivelLabel}</span></td>
      <td>${escHtml(a.tipo)}</td>
      <td>${escHtml(a.tema)}</td>
      <td>${a.temaPadre ? escHtml(a.temaPadre) : "-"}</td>
      <td>${respDisplay(a.responsable)}</td>
      <td class="mono">${a.expediente || "-"}</td>
      <td>${fmtDateNice(a.fechaLimite)}</td>
      <td><span class="row-edit-hint">${icon("lapiz", 12)} Editar</span></td>
    </tr>`).join("") || `<tr><td colspan="8" style="color:var(--muted);text-align:center">Sin alertas activas.</td></tr>`;

  els.tableAlertas.querySelectorAll("[data-tema]").forEach((row) =>
    row.addEventListener("click", () => openTemaFormById(row.dataset.tema))
  );
}

// =========================================================
// REPORTES
// =========================================================
function renderReportes() {
  renderReportFiltersToggle();
  const temas = getReportTemas(state.reportFilters);
  const allHitos = temas.flatMap((t) => t.hitos);
  const hitosVencidos = allHitos.filter((h) => h.estado !== "Cerrado" && daysUntil(h.fechaLimite) < 0);

  const items = [
    ["Temas por estado",       objToText(countBy(temas, "estado"))],
    ["Temas por responsable",  objToText(countBy(temas, "responsable"))],
    ["Tiempo prom. resolucion", `${avgResolutionDays(temas)} dias`],
    ["Temas vencidos",         temas.filter((t) => t.estado !== "Cerrado" && daysUntil(t.fechaLimite) < 0).length],
    ["Hitos vencidos",         hitosVencidos.length],
    ["Expedientes activos",    state.expedientes.filter((x) => x.estado === "Activo").length]
  ];

  const hitosVencidosDetail = hitosVencidos.length
    ? `<ul style="font-size:12px;margin:4px 0 0;padding-left:14px">${hitosVencidos.slice(0, 5).map((h) => `<li>${escHtml(h.nombre)} — ${fmtDateNice(h.fechaLimite)}</li>`).join("")}${hitosVencidos.length > 5 ? `<li>... y ${hitosVencidos.length - 5} mas</li>` : ""}</ul>` : "";

  els.reportCards.innerHTML = items.map((r, i) => `
    <article class="card">
      <h3 style="font-size:14px;margin-bottom:6px">${r[0]}</h3>
      <p>${r[1]}</p>
      ${i === 5 ? hitosVencidosDetail : ""}
    </article>`).join("");
}

// =========================================================
// REPORTES — panel "Personalizar" (filtros propios, separados de los
// filtros globales de arriba)
// =========================================================
const REPORT_ESTADO_DISPLAY = { "En revision": "En revisión" };

function reportFiltersCount(f) {
  let n = 0;
  if (f.dateFrom || f.dateTo) n++;
  if (f.estados.length) n++;
  if (f.prioridades.length) n++;
  if (f.responsables.length) n++;
  if (f.dependencias.length) n++;
  if (f.etiquetas.length) n++;
  if (f.expediente) n++;
  if (f.soloVencidos) n++;
  if (f.incluirPrivados) n++;
  if (f.soloConExpediente) n++;
  return n;
}

function renderReportFiltersToggle() {
  const btn = els.toggleReportFilters;
  if (!btn) return;
  const n = reportFiltersCount(state.reportFilters);
  let countEl = btn.querySelector(".count");
  if (n > 0) {
    if (!countEl) {
      countEl = document.createElement("span");
      countEl.className = "count";
      btn.appendChild(countEl);
    }
    countEl.textContent = n;
  } else if (countEl) {
    countEl.remove();
  }
}

function reportChipHtml(value, label, on, dotClass) {
  return `<label class="chip ${on ? "on" : ""}" data-chip="${escHtml(value)}">
    <input type="checkbox" ${on ? "checked" : ""}>${dotClass ? `<span class="dot ${dotClass}"></span>` : ""}${escHtml(label)}
  </label>`;
}

function renderReportChipSet(container, key) {
  if (!container) return;
  const selected = reportFiltersDraft[key];
  let options;
  if (key === "estados") {
    options = state.columnas.slice().sort((a, b) => a.orden - b.orden).map((c) => ({ value: c.nombre, label: REPORT_ESTADO_DISPLAY[c.nombre] || c.nombre, dotClass: `dot-${c.nombre.toLowerCase().replace(/\s+/g, "-")}` }));
  } else if (key === "prioridades") {
    options = ["Alta", "Media", "Baja"].map((p) => ({ value: p, label: p }));
  } else if (key === "responsables") {
    options = state.responsables
      .map((r) => [r.nombre, r.apellido].filter(Boolean).join(" "))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .map((n) => ({ value: n, label: n }));
  } else if (key === "dependencias") {
    options = unique(state.responsables.map((r) => r.dependencia)).sort((a, b) => a.localeCompare(b)).map((d) => ({ value: d, label: d }));
  } else if (key === "etiquetas") {
    const activas = unique(
      state.temas.filter(isTemaVisible).filter((t) => t.estado !== "Cerrado").flatMap((t) => (t.etiquetas || []).map((e) => e.nombre))
    );
    options = activas.sort((a, b) => a.localeCompare(b)).map((e) => ({ value: e, label: e }));
  } else {
    options = [];
  }
  container.innerHTML = options.length
    ? options.map((o) => reportChipHtml(o.value, o.label, selected.includes(o.value), o.dotClass)).join("")
    : `<span style="font-size:12px;color:var(--muted)">Sin opciones</span>`;
  container.querySelectorAll(".chip").forEach((chip) => {
    const input = chip.querySelector("input");
    // Escuchar "change" en el checkbox (no "click" en el label): un label que
    // envuelve un input reenvia el click al input, que burbujea de nuevo hacia
    // el label — un listener de click en el label se dispara dos veces por
    // cada click real y termina siendo un no-op neto.
    input.addEventListener("change", () => {
      const value = chip.dataset.chip;
      const arr = reportFiltersDraft[key];
      const idx = arr.indexOf(value);
      if (input.checked && idx === -1) arr.push(value);
      else if (!input.checked && idx !== -1) arr.splice(idx, 1);
      chip.classList.toggle("on", input.checked);
      updateReportFiltersFooter();
    });
  });
}

function updateReportFiltersFooter() {
  if (!els.reportFiltersHint) return;
  const n = reportFiltersCount(reportFiltersDraft);
  const total = state.temas.filter(isTemaVisible).length;
  const filtrado = getReportTemas(reportFiltersDraft).length;
  els.reportFiltersHint.innerHTML = `<b>${n}</b> filtro${n === 1 ? "" : "s"} activo${n === 1 ? "" : "s"} · el reporte tendría <b>${filtrado}</b> de ${total} temas`;
}

function renderReportFiltersPanel() {
  els.reportDateField.value = reportFiltersDraft.dateField;
  els.reportDateFrom.value = reportFiltersDraft.dateFrom;
  els.reportDateTo.value = reportFiltersDraft.dateTo;
  els.reportExpediente.value = reportFiltersDraft.expediente;
  els.reportSoloVencidos.checked = reportFiltersDraft.soloVencidos;
  els.reportIncluirPrivados.checked = reportFiltersDraft.incluirPrivados;
  els.reportSoloConExpediente.checked = reportFiltersDraft.soloConExpediente;
  els.reportSeccionResumen.checked = reportFiltersDraft.secciones.resumen;
  els.reportSeccionTemas.checked = reportFiltersDraft.secciones.temas;
  els.reportSeccionHitos.checked = reportFiltersDraft.secciones.hitos;
  els.reportSeccionExpedientes.checked = reportFiltersDraft.secciones.expedientes;
  els.reportSeccionActividad.checked = reportFiltersDraft.secciones.actividad;

  els.reportIncluirPrivadosRow?.classList.toggle("hidden", !esAdmin());

  renderReportChipSet(els.reportChipsEstado, "estados");
  renderReportChipSet(els.reportChipsPrioridad, "prioridades");
  renderReportChipSet(els.reportChipsResponsable, "responsables");
  renderReportChipSet(els.reportChipsDependencia, "dependencias");
  renderReportChipSet(els.reportChipsEtiqueta, "etiquetas");

  updateReportFiltersFooter();
}

function wireReportFiltersPanel() {
  els.toggleReportFilters.addEventListener("click", () => {
    const opening = !els.reportFiltersPanel.classList.contains("open");
    if (opening) {
      reportFiltersDraft = JSON.parse(JSON.stringify(state.reportFilters));
      renderReportFiltersPanel();
    }
    els.reportFiltersPanel.classList.toggle("open", opening);
    els.toggleReportFilters.classList.toggle("open", opening);
  });

  [els.reportDateField].forEach((el) => el.addEventListener("change", () => {
    reportFiltersDraft.dateField = els.reportDateField.value;
    updateReportFiltersFooter();
  }));
  [els.reportDateFrom, els.reportDateTo].forEach((el) => el.addEventListener("change", () => {
    reportFiltersDraft.dateFrom = els.reportDateFrom.value;
    reportFiltersDraft.dateTo = els.reportDateTo.value;
    updateReportFiltersFooter();
  }));
  els.reportExpediente.addEventListener("input", () => {
    reportFiltersDraft.expediente = els.reportExpediente.value;
    updateReportFiltersFooter();
  });
  els.reportSoloVencidos.addEventListener("change", () => {
    reportFiltersDraft.soloVencidos = els.reportSoloVencidos.checked;
    updateReportFiltersFooter();
  });
  els.reportIncluirPrivados.addEventListener("change", () => {
    reportFiltersDraft.incluirPrivados = els.reportIncluirPrivados.checked;
    updateReportFiltersFooter();
  });
  els.reportSoloConExpediente.addEventListener("change", () => {
    reportFiltersDraft.soloConExpediente = els.reportSoloConExpediente.checked;
    updateReportFiltersFooter();
  });
  const seccionMap = {
    reportSeccionResumen: "resumen", reportSeccionTemas: "temas", reportSeccionHitos: "hitos",
    reportSeccionExpedientes: "expedientes", reportSeccionActividad: "actividad"
  };
  Object.entries(seccionMap).forEach(([id, key]) => {
    els[id].addEventListener("change", () => { reportFiltersDraft.secciones[key] = els[id].checked; });
  });

  els.resetReportFilters.addEventListener("click", () => {
    reportFiltersDraft = defaultReportFilters();
    renderReportFiltersPanel();
  });
  els.cancelReportFilters.addEventListener("click", () => {
    els.reportFiltersPanel.classList.remove("open");
    els.toggleReportFilters.classList.remove("open");
  });
  els.applyReportFilters.addEventListener("click", () => {
    state.reportFilters = JSON.parse(JSON.stringify(reportFiltersDraft));
    els.reportFiltersPanel.classList.remove("open");
    els.toggleReportFilters.classList.remove("open");
    renderReportes();
  });

  // Split-buttons: la flecha abre/cierra su menu y cierra el otro; click afuera cierra ambos.
  els.planillaArrow.addEventListener("click", (e) => {
    e.stopPropagation();
    els.informeMenu.classList.remove("open");
    els.planillaMenu.classList.toggle("open");
  });
  els.informeArrow.addEventListener("click", (e) => {
    e.stopPropagation();
    els.planillaMenu.classList.remove("open");
    els.informeMenu.classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    if (!els.planillaMenu.contains(e.target) && e.target !== els.planillaArrow) els.planillaMenu.classList.remove("open");
    if (!els.informeMenu.contains(e.target) && e.target !== els.informeArrow) els.informeMenu.classList.remove("open");
  });

  els.planillaExcelBtn.addEventListener("click", async () => {
    els.planillaMenu.classList.remove("open");
    await withBusy(async () => generarPlanillaExcel(getReportTemas(state.reportFilters), state.reportFilters.secciones));
  });
  els.planillaPdfBtn.addEventListener("click", async () => {
    els.planillaMenu.classList.remove("open");
    await withBusy(async () => generarPlanillaPdf(getReportTemas(state.reportFilters), state.reportFilters.secciones));
  });
  els.informeWordBtn.addEventListener("click", () => {
    els.informeMenu.classList.remove("open");
    showToast("Próximamente: el Informe se define en una siguiente pasada");
  });
  els.informePdfBtn.addEventListener("click", () => {
    els.informeMenu.classList.remove("open");
    showToast("Próximamente: el Informe se define en una siguiente pasada");
  });
}

// =========================================================
// DRAWER — 4 tabs: Detalle / Hitos / Actividad / Documentos
// =========================================================
// Punto de entrada para abrir un tema por id (tarjetas/filas en toda la app):
// resuelve el tema y lo abre en openTemaForm, en modo lectura por defecto.
function openTemaFormById(temaId, opts = {}) {
  const tema = state.temas.find((t) => t.id === temaId);
  if (!tema) return;
  if (!isTemaVisible(tema)) { showToast("Este tema es privado"); return; }
  openTemaForm(tema, undefined, opts);
}

function openExpedienteDrawer(numero) {
  const ex = state.expedientes.find((e) => e.numero === numero);
  if (!ex) return;
  const temasRel = state.temas.filter((t) => t.expediente === ex.numero);
  const hitos = temasRel.flatMap((t) => t.hitos.map((h) => ({ ...h, temaId: t.id })));
  const responsables = unique([ex.responsable, ...temasRel.map((t) => t.responsable), ...hitos.map((h) => h.responsable)]);

  els.drawerBody.innerHTML = `
    <div class="detail-head">
      <div class="title-row"><h2>Expediente ${escHtml(ex.numero)}</h2><span class="badge b-en-curso">${ex.estado}</span></div>
    </div>
    <div class="detail-grid">
      <div class="k">Tema asociado</div><div class="v">${escHtml(ex.temaAsociado)}</div>
      <div class="k">Responsable</div><div class="v">${respDisplay(ex.responsable)}</div>
      <div class="k">Inicio</div><div class="v">${fmtDateNice(ex.fechaInicio)}</div>
      <div class="k">Vencimiento</div><div class="v">${fmtDateNice(ex.fechaLimite)}</div>
      <div class="k">Ultima act.</div><div class="v">${fmtDateNice(ex.ultimaActualizacion)}</div>
      <div class="k">GDE</div><div class="v"><a href="#" class="gde-link" data-gde-open="${escHtml(ex.numero)}">${escHtml(ex.gde || ex.numero)}</a></div>
    </div>
    <article class="card" style="margin-top:12px"><h4 style="margin-bottom:8px">Temas asociados</h4>${temasRel.length ? temasRel.map((t) => `<p>· ${t.id} - ${escHtml(t.nombre)} ${badge(t.estado)}</p>`).join("") : "<p style='color:var(--muted)'>Sin temas.</p>"}</article>
    <article class="card" style="margin-top:8px"><h4 style="margin-bottom:8px">Hitos</h4>${hitos.length ? hitos.map((h) => `<p>· ${h.temaId}: ${escHtml(h.nombre)} ${badge(h.estado)}</p>`).join("") : "<p style='color:var(--muted)'>Sin hitos.</p>"}</article>
    <article class="card" style="margin-top:8px"><h4 style="margin-bottom:8px">Documentos</h4><div id="expDocList">${ex.documentos.length ? ex.documentos.map((d) => renderDocItem(d)).join("") : "<p style='color:var(--muted)'>Sin documentos.</p>"}</div></article>
    <article class="card" style="margin-top:8px"><h4 style="margin-bottom:8px">Historial</h4>${ex.historial.length ? ex.historial.map((h) => `<p>${fmtDateNice(h.at)} · ${escHtml(h.event)}</p>`).join("") : "<p style='color:var(--muted)'>Sin historial.</p>"}</article>
    <article class="card" style="margin-top:8px"><h4 style="margin-bottom:8px">Responsables</h4>${responsables.map((r) => `<p>${icon("usuario", 14)} ${escHtml(r)}</p>`).join("")}</article>
  `;
  els.drawer.classList.add("open");
  els.drawerOverlay.classList.add("open");
  els.drawerBody.querySelectorAll("[data-gde-open]").forEach((a) => {
    a.addEventListener("click", (e) => { e.preventDefault(); openGDE(a.dataset.gdeOpen); });
  });
  wireDocDownloads(els.drawerBody.querySelector("#expDocList"));
}

function attemptCloseDrawer() {
  if (drawerHasUnsavedChanges) alert("Hay cambios sin guardar. Si sale, los cambios no se aplicarán.");
  closeDrawer();
}

function closeDrawer() {
  els.drawer.classList.remove("open");
  els.drawerOverlay.classList.remove("open");
  drawerHasUnsavedChanges = false;
  currentDrawerTemaId = null;
}

// =========================================================
// Forms (CRUD)
// =========================================================
function buildRespSelector(currentValue) {
  const selected = (currentValue || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!state.responsables.length) {
    return `<label><span>Responsable <span style="color:#dc2626">*</span></span><input name="responsable" value="${escHtml(currentValue || "")}" required /></label>`;
  }
  const opts = state.responsables.map((r) => {
    const full = [r.nombre, r.apellido].filter(Boolean).join(" ");
    const chk = selected.includes(full) ? "checked" : "";
    return `<label class="resp-cb-label"><input type="checkbox" name="resp_cb" value="${escHtml(full)}" ${chk}>${escHtml(full)}</label>`;
  }).join("");
  const displayLabel = selected.length ? escHtml(selected.join(", ")) : "-- Seleccionar --";
  const placeholderClass = selected.length ? "" : "placeholder";
  return `
    <label><span>Responsable <span style="color:#dc2626">*</span></span>
      <div class="resp-dropdown">
        <button type="button" class="resp-dropdown-trigger">
          <span class="resp-dropdown-label ${placeholderClass}">${displayLabel}</span>
          <span class="resp-dropdown-arrow">${icon("chevronAbajo", 12)}</span>
        </button>
        <div class="resp-dropdown-panel">
          <div class="resp-dropdown-options">${opts}</div>
          <div class="resp-dropdown-footer">
            <button type="button" class="resp-dropdown-addnew">+ Agregar nuevo responsable</button>
          </div>
        </div>
      </div>
    </label>`;
}

function getSelectedResp(form) {
  const cbs = [...form.querySelectorAll('[name="resp_cb"]:checked')];
  if (cbs.length) return cbs.map((cb) => cb.value).join(", ");
  const inp = form.querySelector('[name="responsable"]');
  return inp ? inp.value.trim() : "";
}

function updateRespLabel(dd) {
  const label = dd.querySelector(".resp-dropdown-label");
  const checked = [...dd.querySelectorAll('[name="resp_cb"]:checked')].map((cb) => cb.value);
  if (checked.length) { label.textContent = checked.join(", "); label.classList.remove("placeholder"); }
  else { label.textContent = "-- Seleccionar --"; label.classList.add("placeholder"); }
}

function initRespDropdowns(container) {
  container.querySelectorAll(".resp-dropdown").forEach((dd) => {
    const trigger = dd.querySelector(".resp-dropdown-trigger");
    const addBtn = dd.querySelector(".resp-dropdown-addnew");
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasOpen = dd.classList.contains("open");
      document.querySelectorAll(".resp-dropdown.open").forEach((x) => x.classList.remove("open"));
      if (!wasOpen) dd.classList.add("open");
    });
    dd.querySelectorAll('[name="resp_cb"]').forEach((cb) => cb.addEventListener("change", () => updateRespLabel(dd)));
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        dd.classList.remove("open");
        openQuickRespModal((fullName) => {
          const opts = dd.querySelector(".resp-dropdown-options");
          const lbl = document.createElement("label");
          lbl.className = "resp-cb-label";
          lbl.innerHTML = `<input type="checkbox" name="resp_cb" value="${escHtml(fullName)}" checked>${escHtml(fullName)}`;
          lbl.querySelector("input").addEventListener("change", () => updateRespLabel(dd));
          opts.appendChild(lbl);
          updateRespLabel(dd);
        });
      });
    }
  });
}

function openQuickRespModal(onSave) {
  const dlg = document.getElementById("modalNewResp");
  const form = document.getElementById("newRespForm");
  form.reset();
  async function handleSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.nombre?.trim()) { showToast("El nombre es requerido"); return; }
    const ui = { nombre: data.nombre.trim(), apellido: (data.apellido || "").trim(), email: data.email || "", cargo: data.cargo || "", dependencia: data.dependencia || "", usuarioGDE: "" };
    await withBusy(async () => {
      const created = await dataApi.createResponsable(ui);
      state.responsables.push(created);
      dlg.close();
      renderResponsables();
      if (onSave) onSave([created.nombre, created.apellido].filter(Boolean).join(" "));
    });
  }
  dlg.addEventListener("close", () => form.removeEventListener("submit", handleSubmit), { once: true });
  form.addEventListener("submit", handleSubmit);
  document.getElementById("cancelNewRespBtn").onclick = () => dlg.close();
  dlg.showModal();
}

// =========================================================
// Dias restantes badge (reuses badge/b-* palette: verde >7, amarillo 0-7, rojo <0)
// Si el tema/hito esta Cerrado, el conteo se congela a fechaCierre en vez de
// seguir corriendo contra hoy; al revertir el estado (fechaCierre vacia) vuelve
// a contar normalmente.
// =========================================================
function diasRestantesInfo(fechaLimite, fechaCierre) {
  const d = fechaCierre ? daysBetween(fechaCierre, fechaLimite) : daysUntil(fechaLimite);
  const cls = d > 7 ? "b-cerrado" : d >= 0 ? "b-bloqueado" : "b-pendiente";
  const text = `${d}d`;
  return { dias: d, cls, text };
}

function diasRestantesBadge(fechaLimite, fechaCierre, id) {
  const idAttr = id ? ` id="${id}"` : "";
  if (!fechaLimite) return `<span class="badge dias-rest-badge"${idAttr}></span>`;
  const { cls, text } = diasRestantesInfo(fechaLimite, fechaCierre);
  return `<span class="badge dias-rest-badge ${cls}"${idAttr}>${text}</span>`;
}

// getFechaCierre: callback opcional para congelar el badge en vivo mientras se
// edita (lee el estado/fechaCierre actuales del draft en edicion).
function wireDiasBadge(inputEl, badgeEl, getFechaCierre) {
  if (!inputEl || !badgeEl) return;
  const update = () => {
    if (!inputEl.value) { badgeEl.textContent = ""; badgeEl.className = "badge dias-rest-badge"; return; }
    const fc = getFechaCierre ? getFechaCierre() : null;
    const { cls, text } = diasRestantesInfo(inputEl.value, fc);
    badgeEl.className = `badge dias-rest-badge ${cls}`;
    badgeEl.textContent = text;
  };
  inputEl.addEventListener("input", update);
  return update;
}

function respAvatarHtml(fullName) {
  const name = (fullName || "").split(",")[0].trim();
  if (!name) return `<span class="resp-avatar-sm" style="background:var(--muted)" title="Sin responsable">?</span>`;
  const idx = state.responsables.findIndex((r) => [r.nombre, r.apellido].filter(Boolean).join(" ") === name);
  const fallbackIdx = parseInt(simpleHash(name), 10) || 0;
  const color = RESP_PALETTE[(idx >= 0 ? idx : fallbackIdx) % RESP_PALETTE.length];
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return `<span class="resp-avatar-sm" style="background:${color}" title="${escHtml(fullName || "")}">${initials}</span>`;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// scrollHeight sale mal si se mide antes de que el layout final este listo.
// Dos causas independientes, asi que se cubren las dos:
// 1) el textarea todavia no esta realmente visible: dentro de un .task-pane
//    oculto (display:none, p.ej. se abrio "Editar" estando en otra pestaña
//    — por eso el resize se re-dispara tambien al activar la pestaña Tarea)
//    o, el caso mas comun, porque el <dialog> se arma con
//    renderTaskFormShell() ANTES de llamar a .showModal() — un dialog
//    cerrado no tiene layout. requestAnimationFrame lo difiere al frame
//    siguiente, para cuando el dialog ya esta mostrado y con layout real.
// 2) la tipografia "Inter" se carga via Google Fonts con display=swap: el
//    primer paint usa una fuente de respaldo (mas angosta/ancha) y recien
//    cuando termina de cargar Inter el texto puede re-wrappear a otra
//    cantidad de lineas — sin un nuevo resize, el alto queda pisado con el
//    valor viejo. document.fonts.ready cubre ese swap tardio.
function autoResizeTextarea(el) {
  if (!el) return;
  const resize = () => { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; };
  requestAnimationFrame(resize);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(resize).catch(() => {});
  }
}

// =========================================================
// Motor de dependencias entre hitos (predecesor -> sucesor, estilo MS
// Project). Un hito admite un unico predecesor: el grafo resultante es un
// bosque (cada nodo con <=1 padre, aunque puede tener varios hijos que lo
// tomen como predecesor). Los campos fechaInicio/fechaLimite dejan de ser
// editables a mano: los recalcula este motor y son los que se persisten y
// usan en el resto de la app (Gantt, badges, tablas, kanban).
//
// TODO (fuera de alcance): si se necesitan multiples predecesores por hito,
// este motor pasa de "un predecesorId" a un array de vinculos y el calculo
// de ancla tomaria el maximo entre todos los predecesores (constraint-driven
// scheduling); calcularCriticoHito dejaria de poder asumir cadena lineal.
// =========================================================
const TIPO_VINCULO_INFO = {
  FC: { label: "Fin-Comienzo", ayuda: "Arranca cuando termina el predecesor." },
  CC: { label: "Comienzo-Comienzo", ayuda: "Arranca el mismo dia que arranca el predecesor." },
  FF: { label: "Fin-Fin", ayuda: "Termina el mismo dia que termina el predecesor." }
};

function hitoPanelModoAyudaTexto(tipo) {
  return tipo === "FF"
    ? "Con vinculo Fin-Fin podes fijar una fecha comprometida: si el predecesor se atrasa y ya no se llega, este hito NO se mueve solo — se marca critico."
    : "Este hito se mueve automaticamente cuando cambia el predecesor, conservando la distancia configurada (dias o fecha) y su propia duracion.";
}

function hitoPorId(hitos, id) { return hitos.find((h) => h.id === id) || null; }

function sumarDias(fechaStr, dias) {
  const d = new Date(`${fechaStr}T00:00:00`);
  d.setDate(d.getDate() + Math.round(dias || 0));
  return fmtDate(d);
}

// Recorre la cadena de predecesores desde `candidatoPredecesorId` hacia atras;
// true si en algun punto se llega a `hitoId` (o son el mismo hito) — asignar
// ese predecesor cerraria un ciclo.
function predecesorGeneraCiclo(hitos, hitoId, candidatoPredecesorId) {
  if (!candidatoPredecesorId) return false;
  if (candidatoPredecesorId === hitoId) return true;
  let cursor = hitoPorId(hitos, candidatoPredecesorId);
  const visitados = new Set();
  while (cursor) {
    if (cursor.id === hitoId) return true;
    if (visitados.has(cursor.id)) return true; // ciclo preexistente (defensivo)
    visitados.add(cursor.id);
    cursor = cursor.predecesorId ? hitoPorId(hitos, cursor.predecesorId) : null;
  }
  return false;
}

// Orden topologico (predecesores antes que sus sucesores). Con un unico
// predecesor por hito alcanza con ir "liberando" los hitos cuyo predecesor
// ya fue resuelto (o no tienen, o el predecesor es un dato huerfano).
function ordenTopologicoHitos(hitos) {
  const resuelto = new Set();
  const orden = [];
  let pendientes = hitos.slice();
  let guard = 0;
  while (pendientes.length && guard++ <= hitos.length) {
    const [listos, resto] = [[], []];
    pendientes.forEach((h) => {
      const libre = !h.predecesorId || resuelto.has(h.predecesorId) || !hitoPorId(hitos, h.predecesorId);
      (libre ? listos : resto).push(h);
    });
    if (!listos.length) break; // ciclo remanente (no deberia pasar, se bloquea al guardar)
    listos.forEach((h) => { orden.push(h); resuelto.add(h.id); });
    pendientes = resto;
  }
  orden.push(...pendientes); // resto de un ciclo defensivo: no se pierde el dato
  return orden;
}

// Fechas de UN hito ya con su predecesor resuelto (fechas del predecesor ya
// calculadas, porque se recorre en orden topologico).
function calcularFechasHito(hito, predecesor) {
  const duracion = Number(hito.duracionPropia) || 0;

  if (!hito.predecesorId || !predecesor) {
    const fechaLimite = hito.fechaManual || hito.fechaLimite || fmtDate(new Date());
    return { fechaInicio: sumarDias(fechaLimite, -duracion), fechaLimite, anclaPredecesor: null, anclaResultado: null };
  }

  const tipo = hito.tipoVinculo || "FC";
  const anclaPredecesor = tipo === "CC" ? predecesor.fechaInicio : predecesor.fechaLimite;
  // "dias": desfasaje relativo, siempre en cascada con el predecesor. "fecha": el
  // hito guarda una fecha propia (fechaManual) — para FC/CC esa fecha se desplaza
  // explicitamente en cascada cuando el predecesor cambia (ver desplazarCascadaPorDelta,
  // conserva la distancia configurada); para FF representa un compromiso externo
  // fijo que NO se mueve solo, y el hito se marca "critico" si deja de ser alcanzable.
  const anclaResultado = hito.modoFecha === "dias"
    ? sumarDias(anclaPredecesor, Number(hito.desfasajeDias) || 0)
    : (hito.fechaManual || anclaPredecesor);

  let fechaInicio, fechaLimite;
  if (tipo === "FF") {
    fechaLimite = anclaResultado;
    fechaInicio = sumarDias(fechaLimite, -duracion);
  } else {
    fechaInicio = anclaResultado;
    fechaLimite = sumarDias(fechaInicio, duracion);
  }
  return { fechaInicio, fechaLimite, anclaPredecesor, anclaResultado };
}

// Aproximacion optimista de holgura (NO es un CPM completo con rutas
// paralelas): para `hito`, busca aguas abajo el/los sucesores mas cercanos
// con un compromiso fijo (vinculo FF con fecha especifica — el unico caso que
// no se mueve solo) y ve si, sumando solo la duracionPropia de los hitos
// intermedios (mejor escenario posible, sin mas desfasajes), se llega a
// tiempo. Si hay varias ramas se reporta la peor. Valido mientras las cadenas
// sean lineales — el caso de uso actual, ya que un hito admite un unico
// predecesor.
function calcularCriticoHito(hito, hitos) {
  const sucesoresDirectos = hitos.filter((h) => h.predecesorId === hito.id);
  if (!sucesoresDirectos.length) return null;

  let peor = null;
  function explorar(sucesor, duracionAcumulada, profundidad) {
    if (profundidad > hitos.length + 1) return; // guarda defensiva
    const duracionConEste = duracionAcumulada + (Number(sucesor.duracionPropia) || 0);
    if (sucesor.tipoVinculo === "FF" && sucesor.modoFecha === "fecha") {
      const fechaMinima = sumarDias(hito.fechaLimite, duracionConEste);
      const excesoDias = daysBetween(sucesor.fechaLimite, fechaMinima);
      if (excesoDias > 0 && (!peor || excesoDias > peor.excesoDias)) {
        peor = { excesoDias, hitoObjetivoId: sucesor.id, hitoObjetivoNombre: sucesor.nombre, fechaMinima, fechaComprometida: sucesor.fechaLimite };
      }
      return; // corta la rama en el primer compromiso fijo aguas abajo
    }
    hitos.filter((h) => h.predecesorId === sucesor.id).forEach((sig) => explorar(sig, duracionConEste, profundidad + 1));
  }
  sucesoresDirectos.forEach((suc) => explorar(suc, 0, 0));
  return peor;
}

// Cuando un hito cambia de fecha, sus sucesores encadenados por FC/CC en modo
// "fecha" (fecha propia elegida a mano) se desplazan la misma cantidad de dias
// que se movio el predecesor — asi conservan la distancia/duracion que el
// usuario configuro, en vez de quedar pegados a su fecha vieja. Los sucesores
// en modo "dias" ya siguen al predecesor solos (formula de calcularFechasHito,
// no necesitan ajuste). Los FF con fecha fija representan un compromiso
// externo: deliberadamente NO se mueven solos (calcularCascadaHitos los marca
// "fuera de secuencia"/"critico" si corresponde). `snapshotAntes` son las
// fechaInicio/fechaLimite de todos los hitos ANTES del cambio que dispara esta
// cascada; `excludeId` es el hito editado a mano (su fecha ya la puso el
// usuario, no hay que "ajustarla" con un delta).
function propagarCascadaPorDelta(hitos, snapshotAntes, excludeId) {
  const porId = new Map(hitos.map((h) => [h.id, h]));
  ordenTopologicoHitos(hitos).forEach((h) => {
    const predecesor = h.predecesorId ? porId.get(h.predecesorId) : null;
    if (h.id !== excludeId && predecesor && h.modoFecha === "fecha" && h.tipoVinculo !== "FF" && h.fechaManual) {
      const antesPred = snapshotAntes.get(predecesor.id);
      if (antesPred) {
        const anclaCampo = h.tipoVinculo === "CC" ? "fechaInicio" : "fechaLimite";
        const delta = daysBetween(antesPred[anclaCampo], predecesor[anclaCampo]);
        if (delta) h.fechaManual = sumarDias(h.fechaManual, delta);
      }
    }
    if (h.id !== excludeId) Object.assign(h, calcularFechasHito(h, predecesor));
  });
}

// Punto de entrada: recalcula en cascada fechaInicio/fechaLimite y las
// alertas de TODOS los hitos de una tarea, mutando los objetos en el lugar
// (son los mismos que vive tema.hitos, se puede llamar tras cualquier
// cambio que afecte fechas y despues comparar que cambio para persistir).
function calcularCascadaHitos(hitos) {
  const porId = new Map(hitos.map((h) => [h.id, h]));
  ordenTopologicoHitos(hitos).forEach((h) => {
    const predecesor = h.predecesorId ? porId.get(h.predecesorId) : null;
    const { fechaInicio, fechaLimite, anclaPredecesor, anclaResultado } = calcularFechasHito(h, predecesor);
    h.fechaInicio = fechaInicio;
    h.fechaLimite = fechaLimite;
    if (h.predecesorId && anclaPredecesor != null) {
      const desfasaje = daysBetween(anclaPredecesor, anclaResultado);
      h.__desfasajeDias = desfasaje;
      h.__alertaFueraDeSecuencia = desfasaje < 0;
      h.__alertaDesfasajeAlto = Math.abs(desfasaje) > 30;
    } else {
      h.__desfasajeDias = null;
      h.__alertaFueraDeSecuencia = false;
      h.__alertaDesfasajeAlto = false;
    }
  });
  hitos.forEach((h) => { h.__critico = calcularCriticoHito(h, hitos); });
  return hitos;
}

// =========================================================
// Mini gantt (Hitos tab) — barras + conectores de dependencia + zoom
// =========================================================
const GANTT_ZOOM_LEVELS = {
  semana:   { label: "Semana",   pxPerDay: 34, markEveryDays: 2 },
  quincena: { label: "Quincena", pxPerDay: 14, markEveryDays: 7 },
  mes:      { label: "Mes",      pxPerDay: 5,  markEveryDays: 14 }
};
let ganttZoom = "mes";

const GANTT_ROW_H = 22;
const GANTT_BAR_H = 11;
const GANTT_AXIS_H = 18;
const GANTT_LABEL_MIN_W = 90;
const GANTT_LABEL_MAX_W = 340;
const GANTT_LABEL_FONT = `10.5px ${getComputedStyle(document.body).fontFamily}`;

// Ancho de columna de nombres ajustado al hito mas largo (hasta un tope) para
// que no se corten los nombres con "..." salvo casos extremos.
let _ganttLabelCtx = null;
function ganttLabelWidth(text) {
  if (!_ganttLabelCtx) {
    _ganttLabelCtx = document.createElement("canvas").getContext("2d");
    _ganttLabelCtx.font = GANTT_LABEL_FONT;
  }
  return _ganttLabelCtx.measureText(text).width;
}

function ganttZoomControlsHtml() {
  return `<div class="gantt-zoom" role="group" aria-label="Zoom del cronograma">
    ${Object.entries(GANTT_ZOOM_LEVELS).map(([key, z]) => `
      <button type="button" class="gantt-zoom-btn ${ganttZoom === key ? "active" : ""}" data-gantt-zoom="${key}">${z.label}</button>
    `).join("")}
  </div>`;
}

function renderMiniGantt(tema) {
  const hitos = tema.hitos || [];
  if (!hitos.length) return `<p style="color:var(--muted);font-size:12.5px">Sin hitos para mostrar en el cronograma.</p>`;

  const zoom = GANTT_ZOOM_LEVELS[ganttZoom] || GANTT_ZOOM_LEVELS.quincena;
  const toDate = (s) => new Date(`${s || fmtDate(new Date())}T00:00:00`);
  const starts = [tema.fechaInicio, ...hitos.map((h) => h.fechaInicio || h.fechaLimite)].filter(Boolean).sort();
  const ends   = [tema.fechaLimite, ...hitos.map((h) => h.fechaLimite)].filter(Boolean).sort();
  let rStart = toDate(starts[0]);
  let rEnd = toDate(ends[ends.length - 1]);
  if (rEnd <= rStart) rEnd = new Date(rStart.getTime() + 86400000 * 7);
  // un poco de aire a cada lado para que las barras de punta no queden pegadas al borde
  rStart = new Date(rStart.getTime() - 86400000 * 2);
  rEnd = new Date(rEnd.getTime() + 86400000 * 2);
  const totalDays = Math.max(1, Math.round((rEnd - rStart) / 86400000));
  const pxPerDay = zoom.pxPerDay;
  const svgW = Math.max(1, totalDays * pxPerDay);
  const svgH = GANTT_AXIS_H + hitos.length * GANTT_ROW_H;
  const xForDate = (d) => Math.round(((toDate(d) - rStart) / 86400000) * pxPerDay);
  const yForIndex = (i) => GANTT_AXIS_H + i * GANTT_ROW_H + (GANTT_ROW_H - GANTT_BAR_H) / 2;

  const idxById = new Map(hitos.map((h, i) => [h.id, i]));

  // -------- grilla + marcas de fecha --------
  let gridSvg = "";
  for (let d = 0; d <= totalDays; d += zoom.markEveryDays) {
    const t = new Date(rStart.getTime() + d * 86400000);
    const x = d * pxPerDay;
    gridSvg += `<line class="gantt-grid-line" x1="${x}" x2="${x}" y1="${GANTT_AXIS_H}" y2="${svgH}"></line>`;
    gridSvg += `<text class="gantt-axis-label" x="${x}" y="${GANTT_AXIS_H - 8}">${fmtDateNice(fmtDate(t)).replace(/\/\d{2}$/, "")}</text>`;
  }

  // -------- linea de "hoy" --------
  const todayX = xForDate(fmtDate(new Date()));
  const todayLine = (todayX >= 0 && todayX <= svgW)
    ? `<line class="gantt-today-line" x1="${todayX}" x2="${todayX}" y1="0" y2="${svgH}"></line>`
    : "";

  // -------- barras --------
  const barsSvg = hitos.map((h, i) => {
    const x0 = xForDate(h.fechaInicio || h.fechaLimite);
    const x1 = xForDate(h.fechaLimite || h.fechaInicio);
    const x = Math.min(x0, x1);
    const w = Math.max(6, Math.abs(x1 - x0));
    const y = yForIndex(i);
    const critico = Boolean(h.__critico);
    const fueraDeSecuencia = Boolean(h.__alertaFueraDeSecuencia);
    const cls = ["gantt-bar-rect", badgeClass(h.estado), fueraDeSecuencia ? "alerta-dura" : "", critico ? "alerta-critico" : ""].filter(Boolean).join(" ");
    const title = [h.nombre, h.estado, fueraDeSecuencia ? "Fuera de secuencia" : "", critico ? "Critico" : ""].filter(Boolean).join(" · ");
    return `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${GANTT_BAR_H}" rx="3.5"><title>${escHtml(title)}</title></rect>`;
  }).join("");

  // -------- conectores de dependencia (angulo recto + punto de llegada) --------
  // La linea toca siempre la barra del sucesor; el punto relleno (mismo color
  // que la linea) marca el contacto en lugar de una flecha.
  const connectorsSvg = hitos.map((h, i) => {
    if (!h.predecesorId) return "";
    const predIdx = idxById.get(h.predecesorId);
    if (predIdx === undefined) return "";
    const pred = hitos[predIdx];
    const tipo = h.tipoVinculo || "FC";
    const predY = yForIndex(predIdx) + GANTT_BAR_H / 2;
    const sucY = yForIndex(i) + GANTT_BAR_H / 2;
    const predX0 = xForDate(pred.fechaInicio || pred.fechaLimite);
    const predX1 = xForDate(pred.fechaLimite || pred.fechaInicio);
    const sucX0 = xForDate(h.fechaInicio || h.fechaLimite);
    const sucX1 = xForDate(h.fechaLimite || h.fechaInicio);
    const linkCls = h.__alertaFueraDeSecuencia ? "gantt-link alerta" : "gantt-link";
    const dotCls = h.__alertaFueraDeSecuencia ? "gantt-link-dot alerta" : "gantt-link-dot";

    if (tipo === "FF") {
      // ambos extremos "fin": la conexion sale y entra por la derecha, con un
      // loop hacia afuera para no cruzar las barras.
      const startX = Math.max(predX0, predX1);
      const endX = Math.max(sucX0, sucX1);
      const loopX = Math.max(startX, endX) + 14;
      return `<path class="${linkCls}" d="M ${startX} ${predY} L ${loopX} ${predY} L ${loopX} ${sucY} L ${endX} ${sucY}"></path>
        <circle class="${dotCls}" cx="${endX}" cy="${sucY}" r="2.5"></circle>`;
    }
    // FC: sale del fin del predecesor. CC: sale del inicio del predecesor.
    const startX = tipo === "CC" ? Math.min(predX0, predX1) : Math.max(predX0, predX1);
    const endX = Math.min(sucX0, sucX1);
    const midX = Math.round((startX + endX) / 2);
    return `<path class="${linkCls}" d="M ${startX} ${predY} L ${midX} ${predY} L ${midX} ${sucY} L ${endX} ${sucY}"></path>
      <circle class="${dotCls}" cx="${endX}" cy="${sucY}" r="2.5"></circle>`;
  }).join("");

  const rowLabels = hitos.map((h) =>
    `<div class="gantt-row-label" style="height:${GANTT_ROW_H}px" title="${escHtml(h.nombre)}">${escHtml(h.nombre)}</div>`
  ).join("");
  const longestLabelPx = hitos.reduce((max, h) => Math.max(max, ganttLabelWidth(h.nombre)), 0);
  const labelW = Math.round(clamp(longestLabelPx + 22, GANTT_LABEL_MIN_W, GANTT_LABEL_MAX_W));

  return `
    <div class="mini-gantt">
      ${ganttZoomControlsHtml()}
      <div class="gantt-layout">
        <div class="gantt-labels" style="width:${labelW}px">
          <div class="gantt-label-spacer" style="height:${GANTT_AXIS_H}px"></div>
          ${rowLabels}
        </div>
        <div class="gantt-scroll">
          <svg class="gantt-svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
            <defs>
              <pattern id="gantt-hatch-alerta" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <rect width="6" height="6" class="gantt-hatch-bg"></rect>
                <line x1="0" y1="0" x2="0" y2="6" class="gantt-hatch-line"></line>
              </pattern>
            </defs>
            ${gridSvg}
            ${todayLine}
            ${connectorsSvg}
            ${barsSvg}
          </svg>
        </div>
      </div>
    </div>`;
}

// Chip de predecesor visible en la lista compacta: si este hito espera a
// que otro cierre (predecesor todavia abierto) o depende de uno que ya
// cerro (cadena resuelta, fechas ya calculadas). El sucesor ("Sigue X") y
// el tipo de vinculo (FC/CC/FF) se sacaron por pedido explicito de la
// previsualizacion: no aportan nada para decidir que hacer con este hito
// puntual, solo suman ruido a la fila.
function hitoPredecesorChipHtml(hito, hitos) {
  if (!hito.predecesorId) return `<span class="hito-dep-chip muted">Sin dependencia</span>`;
  const pred = hitoPorId(hitos, hito.predecesorId);
  const nombre = pred ? pred.nombre : "(hito eliminado)";
  const predCerrado = pred && pred.estado === "Cerrado";
  if (hito.estado !== "Cerrado" && !predCerrado) {
    return `<span class="hito-dep-chip waiting" title="Este hito arranca cuando se cierre '${escHtml(nombre)}'">${icon("espera", 12)} Espera a "${escHtml(nombre)}"</span>`;
  }
  return `<span class="hito-dep-chip" title="Depende de: ${escHtml(nombre)}">${icon("predecesor", 12)} Depende de "${escHtml(nombre)}"</span>`;
}

function hitoAlertBadgesHtml(hito) {
  const out = [];
  if (hito.__alertaFueraDeSecuencia) {
    out.push(`<span class="hito-alert-badge alert-dura" title="El hito queda antes de que su propio disparador ocurra — contradice el vinculo elegido">${icon("alerta", 12)} Fuera de secuencia</span>`);
  }
  if (hito.__alertaDesfasajeAlto) {
    const signo = hito.__desfasajeDias > 0 ? "+" : "";
    out.push(`<span class="hito-alert-badge alert-desfasaje" title="Desfasaje de ${signo}${hito.__desfasajeDias}d contra el ancla del predecesor">${icon("alerta", 12)} Desfasaje ${signo}${hito.__desfasajeDias}d</span>`);
  }
  if (hito.__critico) {
    const c = hito.__critico;
    out.push(`<span class="hito-alert-badge alert-critico" title="Aun en el mejor escenario no se llega a '${escHtml(c.hitoObjetivoNombre)}' (${fmtDateNice(c.fechaComprometida)}): se excede por ${c.excesoDias}d">${icon("alerta", 12)} Crítico</span>`);
  }
  return out.join("");
}

function renderHitosCompactList(tema, opts = {}) {
  if (!tema.hitos.length) return `<p style="color:var(--muted)">Sin hitos registrados.</p>`;
  const readonly = Boolean(opts.readonly);
  return tema.hitos.map((h) => `
    <div class="hito-item" data-hito-id="${h.id}" ${readonly ? "" : `draggable="true"`}>
      <div class="hito-compact-row ${h.estado === "Cerrado" ? "done" : ""}">
        <div class="hito-compact-top">
          ${readonly ? "" : `<span class="hito-drag-handle" title="Arrastrar para reordenar" aria-hidden="true">${icon("reordenar", 14)}</span>`}
          <span class="hito-status-icon ${h.estado === "Cerrado" ? "done" : ""}" aria-hidden="true" title="${h.estado === "Cerrado" ? "Cerrado" : h.estado}">${h.estado === "Cerrado" ? icon("check", 12) : icon("circulo", 12)}</span>
          <div class="hito-compact-main">
            <span class="hito-compact-nombre" title="${escHtml(h.nombre)}">${escHtml(h.nombre)}</span>
            ${h.expediente ? `
            <span class="hito-gde-tag" title="Expediente GDE del hito">
              <span class="hito-gde-num">${escHtml(h.expediente)}</span>
              <a href="#" class="gde-link hito-gde-badge" data-gde-open="${escHtml(h.expediente)}">GDE</a>
            </span>` : ""}
          </div>
          <div class="hito-compact-side">
            ${respAvatarHtml(h.responsable || tema.responsable)}
            ${badge(h.estado)}
            ${puedeEditar() && !readonly ? `<button type="button" class="hito-comment-btn" data-hito-comment="${h.id}" title="Comentar en este hito">${icon("comentario", 15)}</button>` : ""}
            ${readonly ? "" : `
            <div class="hito-actions">
              ${puedeEditar() ? `<button type="button" data-task-edit-hito="${h.id}" title="Editar" aria-expanded="false">${icon("lapiz", 14)}</button>` : ""}
              ${puedeEliminar() ? `<button type="button" class="danger" data-task-delete-hito="${h.id}" title="Eliminar">${icon("papelera", 14)}</button>` : ""}
            </div>`}
          </div>
        </div>
        <div class="hito-compact-meta">
          ${hitoPredecesorChipHtml(h, tema.hitos)}
          ${hitoAlertBadgesHtml(h)}
          <span class="hito-fecha-rango">${fmtDateNice(h.fechaInicio)} → ${fmtDateNice(h.fechaLimite)}</span>
          ${diasRestantesBadge(h.fechaLimite, h.estado === "Cerrado" ? h.fechaCierre : null)}
        </div>
      </div>
      <div class="hito-edit-panel-wrap hidden" id="hitoPanelWrap-${h.id}"></div>
    </div>`).join("");
}

// =========================================================
// Panel de edicion expandible por fila de hito (predecesor, tipo de vinculo,
// modo de fecha, duracion, responsable propio/heredado, expediente).
// Reemplaza al viejo modal chico para la edicion desde el tab Hitos.
// =========================================================
function buildHitoEditPanelHtml(tema, hito) {
  const otrosHitos = tema.hitos.filter((h) => h.id !== hito.id);
  const predOpts = `<option value="">Ninguno</option>` + otrosHitos.map((h) =>
    `<option value="${h.id}" ${hito.predecesorId === h.id ? "selected" : ""}>${escHtml(h.nombre)}</option>`
  ).join("");

  const tienePredecesor = Boolean(hito.predecesorId);
  const tipoActual = hito.tipoVinculo || "FC";
  const tipoOpts = ["FC", "CC", "FF"].map((t) =>
    `<option value="${t}" ${tipoActual === t ? "selected" : ""}>${t} — ${TIPO_VINCULO_INFO[t].label}</option>`
  ).join("");

  const modoFecha = tienePredecesor ? (hito.modoFecha || "fecha") : "fecha";
  const usaRespPropio = Boolean(hito.responsable);
  const respTemaNombre = respDisplay(tema.responsable) || "sin asignar";

  return `
    <div class="hito-edit-panel">
      <div class="hito-panel-topbar">
        <span class="hito-panel-topbar-title">Editando hito</span>
        <div class="hito-panel-topbar-actions">
          <button type="button" class="ghost" id="hitoPanelCancelBtn-${hito.id}">Cancelar</button>
          <button type="button" class="primary" id="hitoPanelSaveBtn-${hito.id}">Guardar</button>
        </div>
      </div>
      ${hito.__critico ? `<div class="hito-panel-critico-banner">${icon("alerta", 14)} <strong>Crítico:</strong> aun en el mejor escenario no se llega a "${escHtml(hito.__critico.hitoObjetivoNombre)}" (${fmtDateNice(hito.__critico.fechaComprometida)}) — se excede por ${hito.__critico.excesoDias}d.</div>` : ""}
      <div id="hitoPanelError-${hito.id}" class="hito-panel-error hidden"></div>

      <div class="hito-panel-grid-2col">
        <label>Nombre<input data-field="nombre" value="${escHtml(hito.nombre)}" required /></label>
        <label>Estado<select data-field="estado">${STATES.map((s) => `<option ${hito.estado === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
      </div>

      <div class="task-section-title">Dependencia</div>
      <div class="hito-panel-grid-2col">
        <label>Predecesor<select id="hitoPanelPredecesor-${hito.id}">${predOpts}</select></label>
        <label>Tipo de vínculo<select id="hitoPanelTipo-${hito.id}" ${tienePredecesor ? "" : "disabled"}>${tipoOpts}</select></label>
      </div>
      <p class="hito-panel-help" id="hitoPanelTipoAyuda-${hito.id}">${tienePredecesor ? TIPO_VINCULO_INFO[tipoActual].ayuda : "Elegí un predecesor para habilitar el tipo de vínculo."}</p>

      <div class="hito-panel-modo-toggle" role="group" aria-label="Modo de fecha">
        <button type="button" class="hito-modo-btn ${modoFecha === "fecha" ? "active" : ""}" data-hito-modo="fecha">Fecha específica</button>
        <button type="button" class="hito-modo-btn ${modoFecha === "dias" ? "active" : ""}" data-hito-modo="dias" ${tienePredecesor ? "" : "disabled"}>Desfasaje (días)</button>
      </div>
      <input type="hidden" id="hitoPanelModoFecha-${hito.id}" value="${modoFecha}" />
      <p class="hito-panel-help" id="hitoPanelModoAyuda-${hito.id}">${tienePredecesor ? hitoPanelModoAyudaTexto(tipoActual) : ""}</p>

      <div class="hito-panel-grid-2col">
        <label id="hitoPanelCampoFecha-${hito.id}" class="${modoFecha === "fecha" ? "" : "hidden"}">Fecha<input type="date" data-field="fechaManual" value="${hito.fechaManual || hito.fechaLimite || ""}" /></label>
        <label id="hitoPanelCampoDesfasaje-${hito.id}" class="${modoFecha === "dias" ? "" : "hidden"}">Desfasaje (días, admite negativos)<input type="number" data-field="desfasajeDias" value="${hito.desfasajeDias ?? 0}" step="1" /></label>
        <label>Duración propia (días)<input type="number" data-field="duracionPropia" value="${hito.duracionPropia ?? 4}" min="1" step="1" /></label>
      </div>

      <div class="task-section-title">Responsable</div>
      <label class="task-check-row">
        <input type="checkbox" id="hitoPanelUsaTemaResp-${hito.id}" ${usaRespPropio ? "" : "checked"} />
        Usar el de la tarea (${escHtml(respTemaNombre)})
      </label>
      <div id="hitoPanelRespWrap-${hito.id}" class="${usaRespPropio ? "" : "hidden"}">${buildRespSelector(hito.responsable || "")}</div>

      <details class="task-section">
        <summary class="task-section-title">Expediente y descripción</summary>
        <label class="task-check-row">
          <input type="checkbox" id="hitoPanelOwnExpChk-${hito.id}" ${hito.expediente ? "checked" : ""} />
          Este hito tiene expediente propio
        </label>
        <div id="hitoPanelExpWrap-${hito.id}" class="${hito.expediente ? "" : "hidden"}">${buildGdeToggleWidget(hito.expediente || "")}</div>
        <label>Descripción<textarea data-field="descripcion">${escHtml(hito.descripcion || "")}</textarea></label>
      </details>
    </div>`;
}

function closeAllHitoEditPanels(exceptHitoId) {
  document.querySelectorAll(".hito-edit-panel-wrap").forEach((wrap) => {
    if (wrap.id !== `hitoPanelWrap-${exceptHitoId}`) {
      wrap.innerHTML = "";
      wrap.classList.add("hidden");
      wrap.closest(".hito-item")?.classList.remove("editing");
    }
  });
  document.querySelectorAll("[data-task-edit-hito]").forEach((btn) => {
    if (btn.dataset.taskEditHito !== exceptHitoId) btn.setAttribute("aria-expanded", "false");
  });
}

function toggleHitoEditPanel(tema, hitoId, refreshCallback) {
  const wrap = document.getElementById(`hitoPanelWrap-${hitoId}`);
  if (!wrap) return;
  const btn = document.querySelector(`[data-task-edit-hito="${hitoId}"]`);
  const yaAbierto = !wrap.classList.contains("hidden") && wrap.innerHTML.trim() !== "";
  closeAllHitoEditPanels(hitoId);
  if (yaAbierto) {
    wrap.innerHTML = "";
    wrap.classList.add("hidden");
    wrap.closest(".hito-item")?.classList.remove("editing");
    btn?.setAttribute("aria-expanded", "false");
    return;
  }
  const hito = tema.hitos.find((h) => h.id === hitoId);
  if (!hito) return;
  wrap.innerHTML = buildHitoEditPanelHtml(tema, hito);
  wrap.classList.remove("hidden");
  wrap.closest(".hito-item")?.classList.add("editing");
  btn?.setAttribute("aria-expanded", "true");
  wireHitoEditPanel(tema, hito, wrap, refreshCallback);
}

function wireHitoEditPanel(tema, hito, panelWrap, refreshCallback) {
  const idPrefix = `hito-${hito.id}-`;
  initRespDropdowns(panelWrap);

  const expWrap = document.getElementById(`hitoPanelExpWrap-${hito.id}`);
  wireGdeToggleWidget(expWrap.querySelector("[data-gde-toggle]"), hito.expediente || "", "pegar", idPrefix);
  const ownExpChk = document.getElementById(`hitoPanelOwnExpChk-${hito.id}`);
  ownExpChk.addEventListener("change", () => expWrap.classList.toggle("hidden", !ownExpChk.checked));

  const usaTemaRespChk = document.getElementById(`hitoPanelUsaTemaResp-${hito.id}`);
  const respWrap = document.getElementById(`hitoPanelRespWrap-${hito.id}`);
  usaTemaRespChk.addEventListener("change", () => respWrap.classList.toggle("hidden", usaTemaRespChk.checked));

  const predecesorSelect = document.getElementById(`hitoPanelPredecesor-${hito.id}`);
  const tipoSelect = document.getElementById(`hitoPanelTipo-${hito.id}`);
  const tipoAyuda = document.getElementById(`hitoPanelTipoAyuda-${hito.id}`);
  const modoHidden = document.getElementById(`hitoPanelModoFecha-${hito.id}`);
  const campoFecha = document.getElementById(`hitoPanelCampoFecha-${hito.id}`);
  const campoDesfasaje = document.getElementById(`hitoPanelCampoDesfasaje-${hito.id}`);
  const modoBtns = panelWrap.querySelectorAll("[data-hito-modo]");
  const errorBox = document.getElementById(`hitoPanelError-${hito.id}`);
  const modoAyuda = document.getElementById(`hitoPanelModoAyuda-${hito.id}`);

  function limpiarError() { errorBox.classList.add("hidden"); errorBox.textContent = ""; }

  function actualizarDisponibilidadPredecesor() {
    const tienePred = Boolean(predecesorSelect.value);
    tipoSelect.disabled = !tienePred;
    modoBtns.forEach((b) => { if (b.dataset.hitoModo === "dias") b.disabled = !tienePred; });
    if (!tienePred) {
      modoHidden.value = "fecha";
      modoBtns.forEach((b) => b.classList.toggle("active", b.dataset.hitoModo === "fecha"));
      campoFecha.classList.remove("hidden");
      campoDesfasaje.classList.add("hidden");
    }
    tipoAyuda.textContent = tienePred
      ? TIPO_VINCULO_INFO[tipoSelect.value || "FC"].ayuda
      : "Elegí un predecesor para habilitar el tipo de vínculo.";
    if (modoAyuda) modoAyuda.textContent = tienePred ? hitoPanelModoAyudaTexto(tipoSelect.value || "FC") : "";
    limpiarError();
  }
  predecesorSelect.addEventListener("change", actualizarDisponibilidadPredecesor);
  tipoSelect.addEventListener("change", () => {
    tipoAyuda.textContent = TIPO_VINCULO_INFO[tipoSelect.value]?.ayuda || "";
    if (modoAyuda) modoAyuda.textContent = hitoPanelModoAyudaTexto(tipoSelect.value);
  });

  modoBtns.forEach((b) => b.addEventListener("click", () => {
    if (b.disabled) return;
    modoHidden.value = b.dataset.hitoModo;
    modoBtns.forEach((x) => x.classList.toggle("active", x === b));
    campoFecha.classList.toggle("hidden", b.dataset.hitoModo !== "fecha");
    campoDesfasaje.classList.toggle("hidden", b.dataset.hitoModo !== "dias");
  }));

  document.getElementById(`hitoPanelCancelBtn-${hito.id}`).addEventListener("click", () => {
    toggleHitoEditPanel(tema, hito.id, refreshCallback);
  });

  // El panel vive anidado dentro de <form id="taskForm"> (el modal del
  // tema). Enter en un input de texto dispara el submit implicito de ESE
  // form, no de este panel -- sin este guard, guardaria el tema entero
  // (y con el bug de nombres duplicados de abajo, pisaba su titulo).
  panelWrap.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") e.preventDefault();
  });

  document.getElementById(`hitoPanelSaveBtn-${hito.id}`).addEventListener("click", async () => {
    const nombre = panelWrap.querySelector('[data-field="nombre"]').value.trim();
    if (!nombre) { showToast("El nombre del hito es requerido"); return; }

    const usaTemaResp = usaTemaRespChk.checked;
    const resp = usaTemaResp ? "" : getSelectedResp(panelWrap);
    if (!usaTemaResp && !resp) { showToast("Selecciona al menos un responsable, o usa el de la tarea"); return; }

    const predecesorId = predecesorSelect.value || null;
    if (predecesorId && predecesorGeneraCiclo(tema.hitos, hito.id, predecesorId)) {
      errorBox.textContent = "Esa dependencia genera un ciclo: el hito elegido depende (directa o indirectamente) de este mismo hito. Elegí otro predecesor.";
      errorBox.classList.remove("hidden");
      return;
    }

    const estado = panelWrap.querySelector('[data-field="estado"]').value;
    const modoFecha = predecesorId ? modoHidden.value : "fecha";
    const fechaManual = panelWrap.querySelector('[data-field="fechaManual"]')?.value || "";
    if (modoFecha === "fecha" && !fechaManual) { showToast("Completá la fecha"); return; }
    const desfasajeDiasRaw = panelWrap.querySelector('[data-field="desfasajeDias"]')?.value;
    const duracionPropiaRaw = panelWrap.querySelector('[data-field="duracionPropia"]')?.value;
    const descripcion = panelWrap.querySelector('[data-field="descripcion"]')?.value || "";
    const hiddenExp = document.getElementById(`${idPrefix}gdeNumeroHidden`);
    const expediente = ownExpChk.checked ? (hiddenExp?.value.trim() || "") : "";

    const fechasAntes = new Map(tema.hitos.map((h) => [h.id, `${h.fechaInicio}|${h.fechaLimite}`]));
    const snapshotAntes = new Map(tema.hitos.map((h) => [h.id, { fechaInicio: h.fechaInicio, fechaLimite: h.fechaLimite }]));

    Object.assign(hito, {
      nombre, estado, descripcion, expediente,
      responsable: usaTemaResp ? "" : resp,
      predecesorId,
      tipoVinculo: predecesorId ? (tipoSelect.value || "FC") : null,
      modoFecha,
      desfasajeDias: predecesorId && modoFecha === "dias" ? (parseInt(desfasajeDiasRaw, 10) || 0) : null,
      fechaManual: modoFecha === "fecha" ? fechaManual : "",
      duracionPropia: Math.max(1, parseInt(duracionPropiaRaw, 10) || 4)
    });

    if (hito.estado === "Cerrado") {
      if (!hito.fechaCierre) hito.fechaCierre = fmtDate(new Date());
    } else if (hito.fechaCierre) {
      hito.fechaCierre = "";
    }

    calcularCascadaHitos(tema.hitos);
    propagarCascadaPorDelta(tema.hitos, snapshotAntes, hito.id);
    calcularCascadaHitos(tema.hitos);
    const cambiados = tema.hitos.filter((h) => h.id === hito.id || fechasAntes.get(h.id) !== `${h.fechaInicio}|${h.fechaLimite}`);

    const saveBtn = document.getElementById(`hitoPanelSaveBtn-${hito.id}`);
    if (saveBtn) saveBtn.disabled = true;
    if (isPersistedTema(tema)) {
      const ok = await withBusy(async () => {
        for (const h of cambiados) await dataApi.updateHito(h.id, h);
        await dataApi.logActivity(tema.id, `Hito ${hito.id} editado`, { hitoId: hito.id });
      });
      if (saveBtn) saveBtn.disabled = false;
      if (!ok) return;
    }
    tema.historial.push({ event: `Hito ${hito.id} editado`, at: fmtDate(new Date()), by: activeUserName() });
    tema.ultimaActualizacion = fmtDate(new Date());
    renderAll();
    refreshCallback();
  });
}

// =========================================================
// Task modal — Tab "Tarea"
// =========================================================
// snapshot/restore: solo los campos que vive el tab "Tarea" (no hitos/documentos/
// comentarios, que ya se persisten al toque y no participan de Cancelar).
const TAREA_FIELDS = ["nombre", "solicitante", "prioridad", "responsable", "expediente", "gde", "fechaInicio", "fechaLimite", "descripcion", "privado", "estado"];

function snapshotTareaFields(draft) {
  const snap = {};
  TAREA_FIELDS.forEach((f) => { snap[f] = draft[f]; });
  snap.etiquetas = (draft.etiquetas || []).map((et) => ({ ...et }));
  return snap;
}

function restoreTareaFields(draft, snap) {
  Object.assign(draft, snap);
  draft.etiquetas = (snap.etiquetas || []).map((et) => ({ ...et }));
}

// Fase 3: General/Hitos/Gantt viven juntos en una unica seccion (no tabs
// separadas entre si). El expediente GDE se muda a su propia solapa de
// accesorio condicional (buildExpedienteTabHtml).
// Etiquetas: bloque siempre visible (no va dentro de ningun acordeon, ver
// mockup v2.5), separado del titulo que ahora vive en el header del modal.
function buildEtiquetasBlockHtml(draft, mode) {
  const editable = mode === "edit";
  const etiquetasChips = (draft.etiquetas || []).map((et, i) => etiquetaChipHtml(et, editable ? { removable: true, index: i } : {})).join("");
  return `
    <div class="task-section">
      <div class="etiquetas-field">
        <span class="etiquetas-field-label">Etiquetas</span>
        <div class="etiquetas-row" id="taskEtiquetasRow">
          <div class="etiquetas-chips" id="taskEtiquetasChips">${etiquetasChips || (editable ? "" : `<span style="color:var(--muted);font-size:12.5px">-</span>`)}</div>
          ${editable ? `<button type="button" class="etiqueta-add-btn" id="taskEtiquetaAddBtn" title="Agregar etiqueta">+</button>
          <div class="etiqueta-popover hidden" id="taskEtiquetaPopover"></div>` : ""}
        </div>
      </div>
    </div>`;
}

// Persistencia de acordeones abiertos/cerrados (Datos/Gantt — Hitos no usa
// esta funcion, ver wireAccordionToggle), mismo patron que feedPanelVisible:
// prefijo "sgtemas_", string "1"/"0" en localStorage, default segun
// defaultOpen. Se lee directo de localStorage (no en una variable de modulo)
// porque el bloque Hitos+Gantt se re-renderiza aparte (ver
// refreshTaskGeneralPane) y necesita el mismo estado sin sincronizar dos
// fuentes de verdad.
function isAccordionOpen(key, defaultOpen = true) {
  const stored = localStorage.getItem(`sgtemas_acc_${key}`);
  if (stored === null) return defaultOpen;
  return stored !== "0";
}
function setAccordionOpen(key, open) {
  localStorage.setItem(`sgtemas_acc_${key}`, open ? "1" : "0");
}
function accordionHeadHtml(key, iconName, label, metaText) {
  return `
    <button type="button" class="task-accordion-head" data-accordion-head="${key}">
      <span class="task-accordion-icon">${icon(iconName, 18)}</span>
      <span class="task-accordion-label mono">${escHtml(label)}</span>
      ${metaText ? `<span class="task-accordion-meta mono">${escHtml(metaText)}</span>` : ""}
      <span class="task-accordion-chev">${icon("chevronAbajo", 16)}</span>
    </button>`;
}
// Anima el alto del cuerpo del acordeon (excepcion documentada a la regla de
// "nunca animar width/height"): se mide scrollHeight y se anima ese valor en
// px, porque CSS no puede transicionar hacia/desde height:auto. Con
// prefers-reduced-motion se salta la animacion y se aplica el estado final
// de una vez.
function animateAccordionToggle(accEl, bodyEl, opening) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  bodyEl.removeEventListener("transitionend", bodyEl.__accTransEnd || (() => {}));
  if (reduce) {
    accEl.classList.toggle("open", opening);
    bodyEl.style.height = "";
    return;
  }
  if (opening) {
    accEl.classList.add("open");
    const target = bodyEl.scrollHeight;
    bodyEl.style.height = "0px";
    requestAnimationFrame(() => { bodyEl.style.height = target + "px"; });
    const onEnd = (e) => {
      if (e.target !== bodyEl || e.propertyName !== "height") return;
      bodyEl.style.height = "auto";
      bodyEl.removeEventListener("transitionend", onEnd);
    };
    bodyEl.__accTransEnd = onEnd;
    bodyEl.addEventListener("transitionend", onEnd);
  } else {
    const current = bodyEl.scrollHeight;
    bodyEl.style.height = current + "px";
    requestAnimationFrame(() => { bodyEl.style.height = "0px"; });
    const onEnd = (e) => {
      if (e.target !== bodyEl || e.propertyName !== "height") return;
      accEl.classList.remove("open");
      bodyEl.style.height = "";
      bodyEl.removeEventListener("transitionend", onEnd);
    };
    bodyEl.__accTransEnd = onEnd;
    bodyEl.addEventListener("transitionend", onEnd);
  }
}
// Se re-cablea cada vez que se pinta el acordeon (render completo o refresh
// puntual de #taskHitosGanttWrap) — busca dentro de todo el form, no solo un
// wrapper, porque Datos vive afuera del bloque que se refresca con los hitos.
function wireAccordionToggle(key) {
  const accEl = els.taskForm.querySelector(`.task-accordion[data-accordion="${key}"]`);
  if (!accEl) return;
  const head = accEl.querySelector(".task-accordion-head");
  const body = accEl.querySelector(".task-accordion-body");
  if (!head || !body) return;
  head.addEventListener("click", () => {
    const opening = !accEl.classList.contains("open");
    // Hitos es el contenido principal del tema: se puede colapsar para esta
    // vista, pero no se persiste — al reabrir el modal (mismo u otro tema)
    // vuelve a abrir por defecto, a diferencia de Datos/Gantt.
    if (key !== "hitos") setAccordionOpen(key, opening);
    animateAccordionToggle(accEl, body, opening);
  });
}

function buildDatosFieldsHtml(draft, mode) {
  const editable = mode === "edit";

  const respField = editable
    ? buildRespSelector(draft.responsable || state.config.currentUser)
    : `<label>Responsable<div class="task-view-value">${respDisplay(draft.responsable)}</div></label>`;

  const prioridadField = editable
    ? `<label>Prioridad<select name="prioridad">${["Alta","Media","Baja"].map((x) => `<option ${(draft.prioridad || "Media") === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>`
    : `<label>Prioridad<div class="task-view-value"><span class="prio prio-${(draft.prioridad || "media").toLowerCase()}">${draft.prioridad || "Media"}</span></div></label>`;

  const solicitanteField = editable
    ? `<label>Solicitante<input name="solicitante" value="${escHtml(draft.solicitante || "")}" /></label>`
    : `<label>Solicitante<div class="task-view-value">${escHtml(draft.solicitante || "-")}</div></label>`;

  const provinciaField = editable
    ? `<label>Provincia<input name="provincia" value="${escHtml(draft.provincia || "")}" /></label>`
    : `<label>Provincia<div class="task-view-value">${escHtml(draft.provincia || "-")}</div></label>`;

  const municipioField = editable
    ? `<label>Municipio<input name="municipio" value="${escHtml(draft.municipio || "")}" /></label>`
    : `<label>Municipio<div class="task-view-value">${escHtml(draft.municipio || "-")}</div></label>`;

  const inicioField = editable
    ? `<label>Inicio<input type="date" name="fechaInicio" value="${draft.fechaInicio || fmtDate(new Date())}" /></label>`
    : `<label>Inicio<div class="task-view-value">${fmtDateNice(draft.fechaInicio)}</div></label>`;

  const vencimientoField = editable
    ? `<label>Vencimiento<input type="date" name="fechaLimite" id="taskFechaLimiteInput" value="${draft.fechaLimite || fmtDate(new Date())}" /></label>`
    : `<label>Vencimiento<div class="task-view-value">${fmtDateNice(draft.fechaLimite)}</div></label>`;

  const diasField = `<label>Días restantes<div class="task-view-value">${diasRestantesBadge(draft.fechaLimite || "", draft.estado === "Cerrado" ? draft.fechaCierre : null, editable ? "taskDiasBadge" : undefined)}</div></label>`;

  const descripcionField = editable
    ? `<label>Descripcion<textarea name="descripcion">${escHtml(draft.descripcion || "")}</textarea></label>`
    : `<label>Descripcion<div class="task-view-value" style="white-space:pre-wrap">${draft.descripcion ? escHtml(draft.descripcion) : "-"}</div></label>`;

  // Nota: "descripcion" ya no se muestra en ningun lado (rediseno v2.5, campo
  // sin uso real) — el dato sigue existiendo en draft/DB, solo se dejo de
  // renderizar. La privacidad se mudo al boton candado del header (ver
  // lockButtonHtml), reemplazando el viejo checkbox de aca.
  return `
    <div class="task-datos-grid">
      ${respField}
      ${prioridadField}
      ${solicitanteField}
      ${provinciaField}
      ${municipioField}
      <div></div>
      ${inicioField}
      ${vencimientoField}
      ${diasField}
    </div>
  `;
}

function wireGeneralTabEvents(draft, mode) {
  if (mode !== "edit") return;

  initRespDropdowns(els.taskForm);

  const nombreInput = document.getElementById("taskNombreInput");
  if (nombreInput) {
    autoResizeTextarea(nombreInput);
    nombreInput.addEventListener("input", () => autoResizeTextarea(nombreInput));
  }
  document.getElementById("taskTitleFocusBtn")?.addEventListener("click", () => {
    nombreInput?.focus();
    nombreInput?.select();
  });

  const privadoBtn = document.getElementById("taskPrivadoBtn");
  const privadoInput = document.getElementById("taskPrivadoInput");
  if (privadoBtn && privadoInput) {
    privadoBtn.addEventListener("click", () => {
      const nowLocked = privadoInput.value !== "1";
      privadoInput.value = nowLocked ? "1" : "";
      privadoBtn.classList.toggle("locked", nowLocked);
      privadoBtn.innerHTML = icon(nowLocked ? "candado" : "candadoAbierto", 16);
      privadoBtn.title = nowLocked ? "Privado — clic para hacer publico" : "Publico — clic para hacer privado";
    });
  }

  const estadoSelect = els.taskForm.querySelector('[name="estado"]');
  const getFechaCierre = () => {
    const currentEstado = estadoSelect ? estadoSelect.value : draft.estado;
    return currentEstado === "Cerrado" ? (draft.fechaCierre || fmtDate(new Date())) : null;
  };
  const updateDiasBadge = wireDiasBadge(document.getElementById("taskFechaLimiteInput"), document.getElementById("taskDiasBadge"), getFechaCierre);
  estadoSelect?.addEventListener("change", () => {
    estadoSelect.dataset.estado = estadoSelect.value;
    updateDiasBadge && updateDiasBadge();
  });
  wireEtiquetasField(draft);
}

// Chips de etiquetas + popover para crear/reusar (dentro del tab "Tarea").
function wireEtiquetasField(draft) {
  draft.etiquetas = draft.etiquetas || [];
  const chipsEl = document.getElementById("taskEtiquetasChips");
  const addBtn = document.getElementById("taskEtiquetaAddBtn");
  const popover = document.getElementById("taskEtiquetaPopover");
  if (!chipsEl || !addBtn || !popover) return;

  function renderChips() {
    chipsEl.innerHTML = draft.etiquetas.map((et, i) => etiquetaChipHtml(et, { removable: true, index: i })).join("");
    chipsEl.querySelectorAll("[data-etiqueta-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        draft.etiquetas.splice(Number(btn.dataset.etiquetaRemove), 1);
        renderChips();
      });
    });
  }
  renderChips();

  function onDocClick(e) {
    if (!popover.contains(e.target) && e.target !== addBtn) closePopover();
  }

  function closePopover() {
    popover.classList.add("hidden");
    popover.innerHTML = "";
    document.removeEventListener("click", onDocClick, true);
  }

  function openPopover() {
    let selectedColor = TAG_COLORS[0].name;
    const existentes = getEtiquetasRegistro().filter((r) => !draft.etiquetas.some((et) => et.nombre === r.nombre));
    popover.innerHTML = `
      <input type="text" id="etiquetaNombreInput" placeholder="Nombre de la etiqueta" />
      <div id="etiquetaColorGrid">${tagColorGridHtml(selectedColor)}</div>
      <button type="button" class="primary etiqueta-crear-btn" id="etiquetaCrearBtn">Crear etiqueta</button>
      ${existentes.length ? `
      <div class="etiqueta-existentes">
        <div class="etiqueta-existentes-title">Etiquetas existentes</div>
        ${existentes.map((r) => `<button type="button" class="etiqueta-existente-item" data-existente-nombre="${escHtml(r.nombre)}" data-existente-color="${r.color}"><span class="etiqueta-swatch-sm" style="background:${resolveTagColor(r.color).bg}"></span>${escHtml(r.nombre)}</button>`).join("")}
      </div>` : ""}
    `;
    popover.classList.remove("hidden");

    const colorGrid = document.getElementById("etiquetaColorGrid");
    function wireColorGridClicks() {
      colorGrid.querySelectorAll("[data-tag-color]").forEach((tile) => {
        tile.addEventListener("click", () => {
          selectedColor = tile.dataset.tagColor;
          colorGrid.innerHTML = tagColorGridHtml(selectedColor);
          wireColorGridClicks();
        });
      });
    }
    wireColorGridClicks();

    document.getElementById("etiquetaCrearBtn").addEventListener("click", async () => {
      const nombre = document.getElementById("etiquetaNombreInput").value.trim();
      if (!nombre) { showToast("El nombre de la etiqueta es requerido"); return; }
      draft.etiquetas.push({ nombre, color: selectedColor });
      renderChips();
      closePopover();
      if (!state.etiquetas.some((e) => e.nombre.toLowerCase() === nombre.toLowerCase())) {
        try {
          const creada = await dataApi.createEtiqueta({ nombre, color: selectedColor, orden: state.etiquetas.length });
          state.etiquetas.push(creada);
        } catch (e) { /* etiqueta duplicada o catalogo no disponible: igual queda guardada en el tema */ }
      }
    });

    popover.querySelectorAll("[data-existente-nombre]").forEach((btn) => {
      btn.addEventListener("click", () => {
        draft.etiquetas.push({ nombre: btn.dataset.existenteNombre, color: btn.dataset.existenteColor });
        renderChips();
        closePopover();
      });
    });

    setTimeout(() => document.addEventListener("click", onDocClick, true), 0);
  }

  addBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!popover.classList.contains("hidden")) { closePopover(); return; }
    openPopover();
  });
}

// =========================================================
// Task modal — Tab "Hitos"
// =========================================================
// Hitos + Gantt: sub-bloque propio dentro de la seccion General, en su
// propio wrapper (#taskHitosGanttWrap) para poder refrescarlo solo a el
// despues de una mutacion de hitos, sin perder lo que este a medio
// escribir en los campos generales (nombre/descripcion/etc, otro wrapper).
function buildHitosGanttSectionHtml(draft, mode) {
  const editable = mode === "edit";
  calcularCascadaHitos(draft.hitos);
  const totalH = draft.hitos.length;
  const doneH = draft.hitos.filter((h) => h.estado === "Cerrado").length;
  return `
    <div class="task-accordion open" data-accordion="hitos">
      ${accordionHeadHtml("hitos", "prioridad", "Hitos", totalH > 0 ? `${doneH}/${totalH}` : "")}
      <div class="task-accordion-body"><div class="task-accordion-body-inner">
        <div class="hito-compact-list" id="taskHitosList">${renderHitosCompactList(draft, { readonly: !editable })}</div>
        ${editable && puedeEditar() ? `<button type="button" class="col-add" id="taskAddHitoBtn" style="margin-top:10px">+ Agregar hito</button>` : ""}
        <div id="taskHitoInlineFormWrap"></div>
      </div></div>
    </div>

    <div class="task-accordion ${isAccordionOpen("gantt", false) ? "open" : ""}" data-accordion="gantt">
      ${accordionHeadHtml("gantt", "ganttBarras", "Gantt")}
      <div class="task-accordion-body"><div class="task-accordion-body-inner">
        <div id="taskGanttWrap">${renderMiniGantt(draft)}</div>
      </div></div>
    </div>
  `;
}

function buildGeneralTabHtml(draft, mode) {
  return `
    <div id="taskEtiquetasWrap">${buildEtiquetasBlockHtml(draft, mode)}</div>
    <div class="task-accordion ${isAccordionOpen("datos", false) ? "open" : ""}" data-accordion="datos">
      ${accordionHeadHtml("datos", "lista", "Datos")}
      <div class="task-accordion-body"><div class="task-accordion-body-inner">${buildDatosFieldsHtml(draft, mode)}</div></div>
    </div>
    <div id="taskHitosGanttWrap">${buildHitosGanttSectionHtml(draft, mode)}</div>
  `;
}

// Arrastrar con el mouse (boton apretado) para desplazar el gantt en horizontal,
// ademas del scrollbar fino.
function wireGanttDragScroll(wrap) {
  const scrollEl = wrap.querySelector(".gantt-scroll");
  if (!scrollEl) return;
  let dragging = false;
  let startX = 0;
  let startScrollLeft = 0;

  scrollEl.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
    startScrollLeft = scrollEl.scrollLeft;
    scrollEl.classList.add("dragging");
    scrollEl.setPointerCapture(e.pointerId);
  });
  scrollEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    scrollEl.scrollLeft = startScrollLeft - (e.clientX - startX);
  });
  const stopDrag = () => { dragging = false; scrollEl.classList.remove("dragging"); };
  scrollEl.addEventListener("pointerup", stopDrag);
  scrollEl.addEventListener("pointercancel", stopDrag);
}

function wireGanttZoom(draft) {
  const wrap = document.getElementById("taskGanttWrap");
  if (!wrap) return;
  wrap.querySelectorAll("[data-gantt-zoom]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (ganttZoom === btn.dataset.ganttZoom) return;
      ganttZoom = btn.dataset.ganttZoom;
      wrap.innerHTML = renderMiniGantt(draft);
      wireGanttZoom(draft);
    });
  });
  wireGanttDragScroll(wrap);
}

function wireHitosListButtons(draft, mode) {
  const list = document.getElementById("taskHitosList");
  if (!list) return;
  list.querySelectorAll("[data-gde-open]").forEach((a) => {
    a.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); openGDE(a.dataset.gdeOpen); });
  });
  list.querySelectorAll("[data-task-edit-hito]").forEach((btn) => {
    btn.addEventListener("click", () => {
      toggleHitoEditPanel(draft, btn.dataset.taskEditHito, () => refreshTaskGeneralPane(draft, mode));
    });
  });
  list.querySelectorAll("[data-task-delete-hito]").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteHito(draft, btn.dataset.taskDeleteHito, { onSaved: () => refreshTaskGeneralPane(draft, mode) });
    });
  });
  list.querySelectorAll("[data-hito-comment]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const hito = hitoPorId(draft.hitos, btn.dataset.hitoComment);
      if (hito) setHitoCommentContext(hito);
    });
  });
}

// Reordenar hitos a mano arrastrando la fila (mismo patron que el drag&drop
// del kanban de temas). Solo en modo edicion — en vista los items no llevan
// draggable ni drag-handle.
function wireHitoDragReorder(draft, mode) {
  if (mode !== "edit") return;
  const list = document.getElementById("taskHitosList");
  if (!list) return;
  let dragId = "";

  list.querySelectorAll(".hito-item[draggable='true']").forEach((item) => {
    item.addEventListener("dragstart", () => {
      dragId = item.dataset.hitoId;
      item.classList.add("dragging");
      closeAllHitoEditPanels(null);
    });
    item.addEventListener("dragend", () => item.classList.remove("dragging"));
    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dragging = list.querySelector(".hito-item.dragging");
      if (!dragging || dragging === item) return;
      const rect = item.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      list.insertBefore(dragging, before ? item : item.nextSibling);
    });
  });

  list.addEventListener("dragover", (e) => e.preventDefault());
  list.addEventListener("drop", async (e) => {
    e.preventDefault();
    if (!dragId) return;
    dragId = "";
    const orderedIds = Array.from(list.querySelectorAll(".hito-item")).map((it) => it.dataset.hitoId);
    const porId = new Map(draft.hitos.map((h) => [h.id, h]));
    draft.hitos = orderedIds.map((id) => porId.get(id)).filter(Boolean);

    if (isPersistedTema(draft)) {
      const ok = await withBusy(async () => { await dataApi.reorderHitos(orderedIds); });
      if (!ok) return;
    }
    renderAll();
    refreshTaskGeneralPane(draft, mode);
  });
}

// Proximo id de hito para un tema: H-<codigo tema sin 'T-'>-<max sufijo + 1>.
function nextHitoId(tema) {
  const base = String(tema.id).replace(/^T-/, "");
  const nums = (tema.hitos || []).map((h) => {
    const m = /(\d+)$/.exec(h.id || "");
    return m ? parseInt(m[1], 10) : 0;
  });
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return `H-${base}-${n}`;
}

function wireAddHitoInline(draft) {
  const addBtn = document.getElementById("taskAddHitoBtn");
  const wrap = document.getElementById("taskHitoInlineFormWrap");
  if (!addBtn || !wrap) return;
  addBtn.addEventListener("click", () => {
    wrap.innerHTML = `
      <div class="hito-inline-form">
        <label>Nombre<input id="inlineHitoNombre" /></label>
        <div class="row">
          <label>Vencimiento<input type="date" id="inlineHitoFecha" value="${fmtDate(new Date())}" /></label>
          <label>Estado<select id="inlineHitoEstado">${STATES.map((s) => `<option>${s}</option>`).join("")}</select></label>
        </div>
        <p class="gde-own-inherited">Sin dependencia ni responsable propio por ahora — se configuran despues desde Editar.</p>
        <div class="btn-group">
          <button type="button" class="primary" id="inlineHitoSaveBtn">Guardar hito</button>
          <button type="button" class="ghost" id="inlineHitoCancelBtn">Cancelar</button>
        </div>
      </div>`;
    addBtn.classList.add("hidden");
    document.getElementById("inlineHitoCancelBtn").addEventListener("click", () => {
      wrap.innerHTML = "";
      addBtn.classList.remove("hidden");
    });
    document.getElementById("inlineHitoSaveBtn").addEventListener("click", async () => {
      const nombre = document.getElementById("inlineHitoNombre").value.trim();
      const fechaManual = document.getElementById("inlineHitoFecha").value;
      const estado = document.getElementById("inlineHitoEstado").value;
      if (!nombre) { showToast("El nombre del hito es requerido"); return; }
      // Sin dependencia al crear (se agrega despues desde el panel de edicion):
      // fechaFin = fechaManual, fechaInicio = fechaFin - duracionPropia.
      const newHito = {
        id: nextHitoId(draft),
        nombre, estado,
        responsable: "",
        predecesorId: null, tipoVinculo: null, modoFecha: "fecha",
        desfasajeDias: null, fechaManual, duracionPropia: 4,
        fechaInicio: "", fechaLimite: "",
        fechaCierre: estado === "Cerrado" ? fmtDate(new Date()) : ""
      };
      draft.hitos.push(newHito);
      calcularCascadaHitos(draft.hitos);
      if (isPersistedTema(draft)) {
        const ok = await withBusy(async () => {
          await dataApi.createHito(draft.id, newHito);
          await dataApi.logActivity(draft.id, "Hito agregado", { hitoId: newHito.id });
        });
        if (!ok) { draft.hitos.pop(); return; }
      }
      draft.historial.push({ event: "Hito agregado", at: fmtDate(new Date()), by: activeUserName() });
      draft.ultimaActualizacion = fmtDate(new Date());
      renderAll();
      refreshTaskGeneralPane(draft, "edit");
    });
  });
}

// Refresca SOLO el sub-bloque de hitos+gantt tras una mutacion de hitos
// (agregar/editar/borrar/reordenar) — nunca el wrapper de campos generales,
// para no pisar lo que el usuario tenga a medio escribir ahi (nombre,
// descripcion, etc.) con una mutacion que no los toca.
function refreshTaskGeneralPane(draft, mode) {
  const wrap = document.getElementById("taskHitosGanttWrap");
  if (!wrap) return;
  wrap.innerHTML = buildHitosGanttSectionHtml(draft, mode);
  wireHitosListButtons(draft, mode);
  wireHitoDragReorder(draft, mode);
  wireGanttZoom(draft);
  wireAccordionToggle("hitos");
  wireAccordionToggle("gantt");
  if (mode === "edit") wireAddHitoInline(draft);
  // Toda mutacion de hitos tambien empuja una entrada de historial — el feed
  // persistente de Comentarios + Actividad debe reflejarla al toque.
  refreshTaskFeedPane(draft, mode);
}

// =========================================================
// Task modal — panel persistente de Comentarios + Actividad (fase 3)
// No es una tab mas: vive siempre visible al costado del contenido
// principal, con un boton para ocultarlo/mostrarlo. Combina en un unico
// feed cronologico los eventos automaticos (activity_log) y los
// comentarios enriquecidos (Quill), cada uno opcionalmente etiquetado
// con el hito puntual al que se refiere.
// =========================================================
let feedPanelVisible = localStorage.getItem("sgtemas_feed_visible") !== "0";
// Filtro de contenido dentro del panel (no confundir con feedPanelVisible,
// que oculta el panel entero): solo comentarios, sin las entradas de
// activity_log — lo mas relevante del panel segun feedback de uso.
let feedOnlyComments = localStorage.getItem("sgtemas_feed_only_comments") === "1";
let feedQuillInstance = null;
let feedMentionCandidates = [];
let feedPendingMenciones = [];
// Comentario en curso dirigido a un hito puntual (boton de comentario en la
// fila del hito, ver renderHitosCompactList) — reemplaza al viejo <select>
// del composer por un chip "Comentando en: X" (rediseno v2.5). Se resetea
// al mandar el comentario, al limpiarlo a mano, o al re-pintar el panel.
let activeHitoCommentContext = null;
// Edicion in-place de un comentario ya guardado: solo uno a la vez (abrir
// "Editar" en otro cierra el anterior, mismo criterio que los popovers).
let editingComentarioId = null;
let editCommentQuillInstance = null;

// Solo quien creo el comentario puede editarlo -- ni el creador de la
// pizarra ni un Admin tienen ese permiso sobre comentarios ajenos, aunque
// si lo tengan para editar el resto del tema (ver esCreadorPizarra en
// otros lados). Mismo criterio que la policy RLS comentarios_update (ver
// supabase/migrations/025) -- si no coincide con el server, el update
// queda bloqueado por RLS aunque el boton se muestre. Borrar es una
// decision de moderacion distinta: sigue permitido al creador de la
// pizarra (comentarios_delete no se toco, ver data-comment-edit-delete).
function puedeEditarComentario(c) {
  return Boolean(c.id) && c.userId === activeUserId();
}

// Feed unico (rediseno v2.5): antes eran dos secciones separadas (Actividad
// arriba, Comentarios abajo); ahora se intercalan por timestamp real. Orden
// mas nuevo primero (arriba) — asi lo ultimo se ve sin tener que recorrer
// todo el panel. Un comentario con hitoId sigue etiquetado con el hito al
// que pertenece (ver feedCommentEntryHtml). feedOnlyComments filtra las
// entradas de activity_log, dejando solo los comentarios (toggle cableado
// en wireFeedPanel, boton #taskFeedFilterToggle).
function buildUnifiedFeedHtml(draft, mode) {
  const activityEntries = feedOnlyComments ? [] : (draft.historial || []).map((h) => ({ type: "activity", at: h.createdAt || h.at, data: h }));
  const commentEntries = (draft.comentarios || []).map((c) => ({ type: "comment", at: c.createdAt || c.at, data: c }));
  const merged = [...activityEntries, ...commentEntries].sort((a, b) => new Date(b.at) - new Date(a.at));
  if (!merged.length) {
    if (feedOnlyComments) return `<p style="color:var(--muted);font-size:12.5px">Todavia no hay comentarios en este tema.</p>`;
    const invitacion = mode === "edit" ? " Escribi el primer comentario abajo." : "";
    return `<p style="color:var(--muted);font-size:12.5px">Todavia no hay actividad en este tema.${invitacion}</p>`;
  }
  return merged.map((e) => (e.type === "activity" ? feedActivityEntryHtml(e.data) : feedCommentEntryHtml(e.data, draft))).join("");
}

// Repinta el feed completo y re-cablea sus botones de Editar/Guardar/Cancelar
// — se llama despues de crear, editar, borrar o cancelar la edicion de un
// comentario. scrollTop a 0 (no al fondo): con lo mas nuevo arriba, el fondo
// ya no es "lo ultimo".
function refreshComentariosList(draft, mode) {
  const list = document.getElementById("taskFeedList");
  if (!list) return;
  list.innerHTML = buildUnifiedFeedHtml(draft, mode);
  list.scrollTop = 0;
  wireComentariosListEvents(draft, mode);
}

function closeCommentEdit() {
  editingComentarioId = null;
  editCommentQuillInstance = null;
}

// Nota: editar/eliminar un comentario propio (o de cualquiera, si sos el
// creador de la pizarra) funciona sin importar el modo view/edit del modal
// -- es una accion autocontenida sobre ESE comentario, distinta de editar
// los campos del tema (ver puedeEditarComentario). Solo la CREACION de
// comentarios nuevos esta atada al modo edicion (ver buildFeedComposerHtml).
function wireComentariosListEvents(draft, mode) {
  const list = document.getElementById("taskFeedList");
  if (!list) return;

  list.querySelectorAll("[data-comment-edit-start]").forEach((btn) => {
    btn.addEventListener("click", () => {
      editingComentarioId = btn.dataset.commentEditStart;
      refreshComentariosList(draft, mode);
    });
  });

  list.querySelector("[data-comment-edit-delete]")?.addEventListener("click", async (e) => {
    const id = e.currentTarget.dataset.commentEditDelete;
    if (!confirm("Eliminar este comentario? Esta accion no se puede deshacer.")) return;
    const target = (draft.comentarios || []).find((c) => c.id === id);
    const hito = target?.hitoId ? hitoPorId(draft.hitos, target.hitoId) : null;
    const evento = hito ? `Comentario eliminado en hito "${hito.nombre}"` : "Comentario eliminado";
    const ok = await withBusy(async () => {
      await dataApi.deleteComentario(id);
      await dataApi.logActivity(draft.id, evento, { hitoId: target?.hitoId || null });
    });
    if (!ok) return;
    draft.comentarios = (draft.comentarios || []).filter((c) => c.id !== id);
    draft.historial.push({ event: evento, at: fmtDate(new Date()), createdAt: new Date().toISOString(), by: activeUserName() });
    closeCommentEdit();
    refreshComentariosList(draft, mode);
  });

  const editQuillContainer = document.getElementById("feedCommentEditQuill");
  if (!editQuillContainer) return; // ningun comentario en edicion ahora mismo

  const comentario = (draft.comentarios || []).find((c) => c.id === editingComentarioId);
  editCommentQuillInstance = new Quill(editQuillContainer, {
    theme: "snow",
    modules: {
      toolbar: {
        container: [["bold", "italic"], [{ list: "ordered" }, { list: "bullet" }], ["link", "image"]],
        handlers: { link: quillLinkHandler }
      }
    }
  });
  if (comentario) editCommentQuillInstance.clipboard.dangerouslyPasteHTML(comentario.text);
  editCommentQuillInstance.focus();
  editCommentQuillInstance.root.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      list.querySelector("[data-comment-edit-save]")?.click();
    }
  });

  list.querySelector("[data-comment-edit-cancel]")?.addEventListener("click", () => {
    closeCommentEdit();
    refreshComentariosList(draft, mode);
  });
  list.querySelector("[data-comment-edit-save]")?.addEventListener("click", async (e) => {
    const id = e.currentTarget.dataset.commentEditSave;
    const html = editCommentQuillInstance.root.innerHTML;
    const plain = editCommentQuillInstance.getText().trim();
    if (!plain) { showToast("El comentario no puede quedar vacio."); return; }
    const target = (draft.comentarios || []).find((c) => c.id === id);
    const textoNuevo = DOMPurify.sanitize(html);
    // A diferencia de crear (que ya queda registrado con solo aparecer en el
    // feed), editar SI deja un movimiento propio -- pero solo si el texto
    // realmente cambio, no por abrir "Editar" y guardar sin tocar nada.
    const huboCambio = Boolean(target) && target.text !== textoNuevo;
    const ok = await withBusy(async () => {
      await dataApi.updateComentario(id, html);
      if (huboCambio) await dataApi.logActivity(draft.id, "Comentario modificado", { hitoId: target?.hitoId || null });
    });
    if (!ok) return;
    if (target) target.text = textoNuevo;
    if (huboCambio) {
      const now = new Date().toISOString();
      draft.historial.push({ event: "Comentario modificado", at: fmtDate(new Date()), createdAt: now, by: activeUserName() });
    }
    closeCommentEdit();
    refreshComentariosList(draft, mode);
  });
}

// Lightbox para imagenes adjuntas en comentarios (Quill las inserta como
// <img> normales, base64 inline) — clic las abre mas grandes, con opcion
// de descargar sin salir del modal de tema.
function openImagePreview(src) {
  document.getElementById("imgPreviewImg").src = src;
  const ext = /^data:image\/(\w+)/.exec(src)?.[1] || "png";
  const downloadBtn = document.getElementById("imgPreviewDownloadBtn");
  downloadBtn.href = src;
  downloadBtn.download = `imagen.${ext === "jpeg" ? "jpg" : ext}`;
  els.modalImagePreview.showModal();
}

function feedActivityEntryHtml(h) {
  const fecha = h.createdAt ? fmtDateTimeNice(h.createdAt) : fmtDateNice(h.at);
  return `
    <div class="feed-entry feed-activity">
      <div class="activity-dot"></div>
      <div class="feed-entry-body">
        <div class="feed-entry-text">${escHtml(h.event)}</div>
        <div class="feed-entry-date">${escHtml(h.by || "sistema")} · ${fecha}</div>
      </div>
    </div>`;
}

// c.text ya es HTML sanitizado (DOMPurify, ver dataApi.createComentario) —
// se inyecta tal cual, nunca con escHtml.
function feedCommentEntryHtml(c, draft) {
  const hito = c.hitoId ? hitoPorId(draft.hitos, c.hitoId) : null;
  const isEditing = Boolean(c.id) && c.id === editingComentarioId;
  return `
    <div class="feed-entry feed-comment" data-comentario-id="${c.id || ""}">
      ${respAvatarHtml(c.by)}
      <div class="feed-entry-body">
        <div class="feed-entry-header">
          <strong>${escHtml(c.by)}</strong>
          <span class="feed-entry-date">${c.createdAt ? fmtDateTimeNice(c.createdAt) : fmtDateNice(c.at)}</span>
        </div>
        ${hito ? `<div class="feed-comment-tag">${icon("prioridad", 12)} ${escHtml(hito.nombre)}</div>` : ""}
        ${isEditing ? `
          <div class="feed-comment-edit-wrap">
            <div class="task-feed-quill-wrap"><div id="feedCommentEditQuill"></div></div>
            <div class="feed-comment-edit-actions">
              <button type="button" class="btn-delete" data-comment-edit-delete="${c.id}">Eliminar</button>
              <div class="feed-comment-edit-actions-right">
                <button type="button" class="ghost" data-comment-edit-cancel>Cancelar</button>
                <button type="button" class="primary" data-comment-edit-save="${c.id}">Guardar</button>
              </div>
            </div>
          </div>` : `
          <div class="feed-comment-body">${c.text}</div>
          ${puedeEditarComentario(c) ? `<button type="button" class="feed-comment-edit-link" data-comment-edit-start="${c.id}">Editar</button>` : ""}`}
      </div>
    </div>`;
}

// El composer (y el boton "Comentar" de una fila de hito, ver
// renderHitosCompactList) solo aparece con el modal en modo edicion — crear
// un comentario nuevo es una accion de edicion como cualquier otra, a
// diferencia de editar/eliminar uno ya existente (ver nota en
// wireComentariosListEvents).
function buildFeedComposerHtml(draft, mode) {
  if (!puedeEditar() || mode !== "edit") return "";
  return `
    <div class="task-feed-composer" id="taskFeedComposerWrap">
      <div class="task-comment-context ${activeHitoCommentContext ? "active" : ""}" id="taskCommentContext">
        ${icon("prioridad", 13)}
        <span>Comentando en: <span id="taskCommentContextName">${activeHitoCommentContext ? escHtml(activeHitoCommentContext.nombre) : ""}</span></span>
        <button type="button" id="taskCommentContextClear" title="Quitar y comentar en el tema">${icon("cerrar", 12)}</button>
      </div>
      <div class="task-feed-quill-wrap">
        <div id="taskFeedQuill"></div>
        <div class="task-feed-mention-menu hidden" id="taskFeedMentionMenu"></div>
      </div>
      <div class="task-feed-composer-actions">
        <div class="task-feed-toolbar" id="taskFeedToolbar">
          <button type="button" class="ql-bold" title="Negrita"></button>
          <button type="button" class="ql-italic" title="Cursiva"></button>
          <button type="button" class="ql-list" value="ordered" title="Lista numerada"></button>
          <button type="button" class="ql-list" value="bullet" title="Viñetas"></button>
          <button type="button" class="ql-link" title="Enlace"></button>
          <button type="button" class="ql-image" title="Adjuntar imagen"></button>
        </div>
        <button type="button" class="primary task-feed-send" id="taskFeedSendBtn">Comentar</button>
      </div>
    </div>`;
}

function buildFeedPanelHtml(draft, mode) {
  return `
    <aside class="task-feed-panel ${feedPanelVisible ? "" : "hidden"}" id="taskFeedPanel">
      <div class="task-feed-header">
        ${icon("historial", 16)}<span class="mono">Actividad</span>
        <button type="button" class="task-feed-filter-toggle" id="taskFeedFilterToggle" title="${feedOnlyComments ? "Mostrar tambien la actividad del sistema" : "Mostrar solo comentarios, sin la actividad del sistema"}">
          <span>Solo comentarios</span>
          <span class="toggle-switch ${feedOnlyComments ? "on" : ""}" id="taskFeedFilterSwitch"></span>
        </button>
      </div>
      <div class="task-feed-list" id="taskFeedList">${buildUnifiedFeedHtml(draft, mode)}</div>
      ${buildFeedComposerHtml(draft, mode)}
    </aside>`;
}

// Setea/limpia el hito activo del composer y anima la aparicion del chip
// (ver .task-comment-context en styles.css — @starting-style + allow-discrete,
// mismo patron que el modal). null limpia y vuelve a "comentario general".
function setHitoCommentContext(hito) {
  activeHitoCommentContext = hito ? { id: hito.id, nombre: hito.nombre } : null;
  const ctx = document.getElementById("taskCommentContext");
  const nameEl = document.getElementById("taskCommentContextName");
  if (ctx) {
    if (hito) {
      if (nameEl) nameEl.textContent = hito.nombre;
      ctx.classList.add("active");
    } else {
      ctx.classList.remove("active");
    }
  }
  if (hito) {
    feedQuillInstance?.focus();
    document.getElementById("taskFeedComposerWrap")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function toggleFeedPanel() {
  feedPanelVisible = !feedPanelVisible;
  localStorage.setItem("sgtemas_feed_visible", feedPanelVisible ? "1" : "0");
  const panel = document.getElementById("taskFeedPanel");
  const btn = document.getElementById("taskFeedToggleBtn");
  if (panel) panel.classList.toggle("hidden", !feedPanelVisible);
  if (btn) btn.title = feedPanelVisible ? "Ocultar actividad" : "Mostrar actividad";
}

// @menciones: implementacion liviana (sin plugin de Quill) — detecta "@algo"
// justo antes del cursor, ofrece candidatos entre los miembros de la
// pizarra actual (creador + colaboradores aceptados, via RPC
// get_board_members) e inserta "@Nombre" como texto en negrita al elegir,
// acumulando el id en feedPendingMenciones para guardarlo en el comentario.
function wireFeedPanel(draft, mode) {
  document.getElementById("taskFeedToggleBtn")?.addEventListener("click", toggleFeedPanel);
  document.getElementById("taskFeedFilterToggle")?.addEventListener("click", () => {
    feedOnlyComments = !feedOnlyComments;
    localStorage.setItem("sgtemas_feed_only_comments", feedOnlyComments ? "1" : "0");
    document.getElementById("taskFeedFilterSwitch")?.classList.toggle("on", feedOnlyComments);
    refreshTaskFeedPane(draft, mode);
  });
  const feedList = document.getElementById("taskFeedList");
  // Delegado en el contenedor (no por <img>): sobrevive a refreshComentariosList,
  // que solo reemplaza el innerHTML de #taskFeedList sin recrear el nodo.
  feedList?.addEventListener("click", (e) => {
    const img = e.target.closest(".feed-comment-body img");
    if (img) { openImagePreview(img.src); return; }
    // Los enlaces vienen del HTML crudo de Quill (sin target propio) --
    // se intercepta el click en vez de bakear target="_blank" al guardar
    // para que tambien funcione en comentarios ya guardados antes de esto.
    const link = e.target.closest(".feed-comment-body a[href]");
    if (link) { e.preventDefault(); window.open(link.href, "_blank", "noopener,noreferrer"); }
  });
  // Antes del early-return de abajo: "Editar"/"Eliminar" en un comentario
  // propio deben funcionar aunque el usuario actual no tenga permiso para
  // crear uno nuevo (ej. su rol cambio despues de comentar, o el modal esta
  // en modo vista y por eso el composer no esta visible).
  wireComentariosListEvents(draft, mode);

  const quillContainer = document.getElementById("taskFeedQuill");
  if (!quillContainer) return; // sin permiso de edicion: no hay composer

  activeHitoCommentContext = null;
  document.getElementById("taskCommentContextClear")?.addEventListener("click", () => setHitoCommentContext(null));

  feedPendingMenciones = [];
  feedMentionCandidates = [];
  feedQuillInstance = new Quill(quillContainer, {
    theme: "snow",
    placeholder: "Escribi un comentario...",
    modules: { toolbar: { container: "#taskFeedToolbar", handlers: { link: quillLinkHandler } } }
  });
  // Ctrl/Cmd+Enter envia sin soltar el mouse — Enter solo hace salto de
  // linea (Quill), asi que no alcanza con eso para no interrumpir el typing.
  feedQuillInstance.root.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      document.getElementById("taskFeedSendBtn")?.click();
    }
  });

  // Se pide en segundo plano, sin bloquear el resto del wiring (boton
  // Comentar incluido): si el usuario comenta antes de que resuelva, las
  // @menciones simplemente no ofrecen candidatos todavia, pero el guardado
  // del comentario nunca debe quedar a la espera de esta llamada (ver bug
  // reportado: el click en "Comentar" se perdia si el listener se
  // registraba recien despues de este await).
  pizarraApi.getBoardMembers(state.currentPizarraId)
    .then((members) => { feedMentionCandidates = members; })
    .catch(() => { feedMentionCandidates = []; });

  const menuEl = document.getElementById("taskFeedMentionMenu");
  feedQuillInstance.on("text-change", () => {
    if (!menuEl) return;
    const sel = feedQuillInstance.getSelection();
    if (!sel) { menuEl.classList.add("hidden"); return; }
    const textBefore = feedQuillInstance.getText(0, sel.index);
    const m = /@([^\s@]{0,30})$/.exec(textBefore);
    if (!m) { menuEl.classList.add("hidden"); return; }
    const q = m[1].toLowerCase();
    const matches = feedMentionCandidates.filter((u) => (u.nombre || "").toLowerCase().includes(q));
    if (!matches.length) { menuEl.classList.add("hidden"); return; }
    menuEl.innerHTML = matches.slice(0, 6).map((u) => `<button type="button" class="task-feed-mention-item" data-mention-id="${u.id}" data-mention-nombre="${escHtml(u.nombre)}" data-mention-at="${m[1].length}">${escHtml(u.nombre)}</button>`).join("");
    menuEl.classList.remove("hidden");
    menuEl.querySelectorAll("[data-mention-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const atLen = Number(btn.dataset.mentionAt);
        const curSel = feedQuillInstance.getSelection();
        if (!curSel) return;
        const from = curSel.index - 1 - atLen;
        const nombre = btn.dataset.mentionNombre;
        feedQuillInstance.deleteText(from, atLen + 1);
        feedQuillInstance.insertText(from, `@${nombre} `, "bold", true);
        feedQuillInstance.setSelection(from + nombre.length + 2);
        if (!feedPendingMenciones.includes(btn.dataset.mentionId)) feedPendingMenciones.push(btn.dataset.mentionId);
        menuEl.classList.add("hidden");
      });
    });
  });

  document.getElementById("taskFeedSendBtn")?.addEventListener("click", async () => {
    const html = feedQuillInstance.root.innerHTML;
    const plain = feedQuillInstance.getText().trim();
    if (!plain) return;
    if (!isPersistedTema(draft)) { showToast("Guarda el tema antes de comentar."); return; }
    const hitoId = activeHitoCommentContext?.id || null;
    const currentUser = activeUserName();
    const menciones = [...feedPendingMenciones];
    let nuevoComentario = null;
    // Cargar el comentario ya queda registrado con solo aparecer en el feed
    // -- no hace falta un movimiento de actividad aparte que repita lo mismo
    // (ver logActivity solo en el edit de abajo, para "Comentario modificado").
    const ok = await withBusy(async () => {
      nuevoComentario = await dataApi.createComentario(draft.id, html, { hitoId, menciones });
    });
    if (!ok) return;
    const now = new Date().toISOString();
    draft.comentarios = draft.comentarios || [];
    // Se usa la fila que devuelve createComentario (con id/userId reales) en
    // vez de armar el objeto a mano — sin eso, "Editar" no funcionaba en un
    // comentario recien creado hasta recargar el tema (no tenia id todavia).
    draft.comentarios.push(nuevoComentario || { by: currentUser, text: DOMPurify.sanitize(html), at: fmtDate(new Date()), createdAt: now, hitoId, menciones });
    draft.ultimaActualizacion = fmtDate(new Date());
    feedQuillInstance.setContents([]);
    feedPendingMenciones = [];
    setHitoCommentContext(null);
    renderAll();
    refreshTaskFeedPane(draft, mode);
  });
}

// scrollTop a 0 (no al fondo): con lo mas nuevo arriba, el fondo ya no es
// "lo ultimo" — ver buildUnifiedFeedHtml.
function refreshTaskFeedPane(draft, mode) {
  const list = document.getElementById("taskFeedList");
  if (!list) return;
  list.innerHTML = buildUnifiedFeedHtml(draft, mode);
  list.scrollTop = 0;
  wireComentariosListEvents(draft, mode);
}

// =========================================================
// Task modal — solapas de accesorios condicionales (fase 3: Expediente y
// Planillas, solo si la pizarra activa los tiene habilitados). Mapa no es
// una solapa del tema (vive a nivel tema pero fuera del modal, fase 5).
// =========================================================
function accesorioHabilitado(key) {
  return Boolean(state.pizarraActual?.accesorios?.[key]?.enabled);
}

function accesoriosDisponiblesParaConectar() {
  return [
    { key: "expediente", label: "Expediente" },
    { key: "planillas", label: "Planillas" }
  ].filter((a) => !accesorioHabilitado(a.key));
}

// Habilitar accesorios por pizarra todavia no existe (fases 4/5) — placeholder
// simple que no bloquea el resto de esta fase, tal como pidio el usuario.
function openConectarAccesorioModal() {
  const disponibles = accesoriosDisponiblesParaConectar();
  els.dynamicForm.innerHTML = `
    <h3>Conectar un accesorio</h3>
    <p style="color:var(--muted);font-size:13px;margin:8px 0 16px">
      ${escHtml(disponibles.map((a) => a.label).join(", "))} todavia no se pueden conectar desde aca — la
      habilitacion de accesorios por pizarra se configura desde ajustes de la pizarra en una proxima fase.
    </p>
    <div class="btn-group" style="justify-content:flex-end">
      <button type="button" class="primary" id="conectarAccesorioOk">Entendido</button>
    </div>
  `;
  els.modalForm.showModal();
  document.getElementById("conectarAccesorioOk").addEventListener("click", () => els.modalForm.close());
}

// Panel "Colaboradores" de la pizarra actual, estilo compartir de Google
// Sheets: invitar por email arriba, lista de "con acceso" (dueno + cada
// colaborador con su rol) abajo. Invitar: si el email ya tiene cuenta en
// notby queda sumado al toque; si no, se crea la cuenta (magic link, ver
// authApi.inviteNewUserByEmail) y como el trigger handle_new_user la deja
// aprobada de una (supabase/migrations/021), se reintenta el alta como
// colaborador en el momento en vez de pedirle al dueno que reinvite despues.
// Solo lo abre el creador de la pizarra (ver esCreadorPizarra() en el
// listener de topbarInviteBtn, y esDueno en renderMisPizarras) --
// list_board_collaborators tambien lo exige del lado del servidor.
// pizarraId/nombre son opcionales: sin argumentos administra la pizarra
// abierta actualmente (uso desde la topbar); "Mis pizarras" pasa una
// pizarra explicita que puede no ser la que esta abierta.
function openColaboradoresModal(pizarraId = state.currentPizarraId, nombre = state.pizarraActual?.nombre) {
  els.dynamicForm.innerHTML = `
    <h3>Colaboradores</h3>
    <p style="color:var(--muted);font-size:13px;margin:8px 0 16px">
      Compartir <strong>${escHtml(nombre || "esta pizarra")}</strong>. Si la persona ya
      tiene cuenta en notby queda sumada al toque; si no, le mandamos un correo para que confirme la suya.
    </p>
    <div class="colab-invite-row">
      <input type="email" id="inviteColabEmail" placeholder="Email de la persona a invitar" required autofocus />
      <select id="inviteColabPermiso">
        <option value="edit">Puede editar</option>
        <option value="view">Solo puede ver</option>
      </select>
      <button class="primary" type="submit">Invitar</button>
    </div>
    <div id="inviteColabMsg"></div>
    <div class="colab-list-title">Con acceso</div>
    <div id="colabList" class="colab-list"><p style="color:var(--muted);font-size:13px">Cargando...</p></div>
    <div class="btn-group" style="justify-content:flex-end;margin-top:6px">
      <button class="ghost js-close-modal-form" type="button">Cerrar</button>
    </div>
  `;

  async function refreshColabList() {
    const listEl = document.getElementById("colabList");
    if (!listEl) return;
    let colaboradores = [];
    try { colaboradores = await pizarraApi.listColaboradores(pizarraId); }
    catch (err) {
      console.error(err);
      listEl.innerHTML = `<p style="color:var(--muted);font-size:13px">No se pudo cargar la lista de colaboradores.</p>`;
      return;
    }
    listEl.innerHTML = colaboradores.map((c) => `
      <div class="colab-row">
        <span class="colab-avatar">${escHtml((c.nombre || c.email || "?").trim().charAt(0).toUpperCase())}</span>
        <span class="colab-info">
          <span class="colab-nombre">${escHtml(c.nombre)}</span>
          <span class="colab-email">${escHtml(c.email)}</span>
        </span>
        ${c.esPropietario ? `
          <span class="colab-rol-fijo">Propietario</span>
        ` : `
          <select class="pill colab-rol-select" data-colab-rol="${c.usuarioId}">
            <option value="edit" ${c.permiso === "edit" ? "selected" : ""}>Editor</option>
            <option value="view" ${c.permiso === "view" ? "selected" : ""}>Visualizador</option>
          </select>
          <button type="button" class="colab-quitar" data-colab-quitar="${c.usuarioId}" title="Quitar acceso" aria-label="Quitar acceso">${icon("papelera", 14)}</button>
        `}
      </div>
    `).join("") || `<p style="color:var(--muted);font-size:13px">Todavia no hay colaboradores.</p>`;

    listEl.querySelectorAll("[data-colab-rol]").forEach((sel) => {
      sel.addEventListener("change", async () => {
        const ok = await withBusy(() => pizarraApi.updateColaboradorPermiso(pizarraId, sel.dataset.colabRol, sel.value));
        if (ok) showToast("Rol actualizado");
      });
    });
    listEl.querySelectorAll("[data-colab-quitar]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const persona = colaboradores.find((c) => c.usuarioId === btn.dataset.colabQuitar);
        if (!confirm(`Quitar a ${persona ? persona.nombre : "esta persona"} de esta pizarra?`)) return;
        const ok = await withBusy(() => pizarraApi.removeColaborador(pizarraId, btn.dataset.colabQuitar));
        if (ok) { showToast("Colaborador quitado"); await refreshColabList(); }
      });
    });
  }

  els.dynamicForm.onsubmit = async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById("inviteColabEmail");
    const email = emailInput.value.trim().toLowerCase();
    const permiso = document.getElementById("inviteColabPermiso").value;
    const msg = document.getElementById("inviteColabMsg");
    const btn = els.dynamicForm.querySelector(".primary");
    if (btn) { btn.disabled = true; btn.textContent = "Invitando..."; }
    msg.innerHTML = "";
    try {
      let candidato = await pizarraApi.findCollaboratorCandidate(email);
      if (!candidato) {
        await authApi.inviteNewUserByEmail(email);
        candidato = await pizarraApi.findCollaboratorCandidate(email);
      }
      if (candidato) {
        await pizarraApi.addColaborador(pizarraId, candidato.id, permiso);
        showToast(`${candidato.nombre} se sumo a esta pizarra.`);
        emailInput.value = "";
        await refreshColabList();
        return;
      }
      msg.innerHTML = `<div class="login-success" style="margin-top:0">Le mandamos un correo a ${escHtml(email)} para que confirme su cuenta. En cuanto entre por primera vez, volvé a invitarla para sumarla.</div>`;
    } catch (err) {
      const rateLimited = err && err.status === 429;
      msg.innerHTML = `<div class="login-error" style="margin-top:0">${rateLimited ? "Ya se mando un correo hace poco. Esperá un minuto y probá de nuevo." : "No se pudo completar la invitacion."}</div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Invitar"; }
    }
  };

  els.modalForm.showModal();
  refreshColabList();
}

function buildExpedienteTabHtml(draft, mode) {
  const editable = mode === "edit";
  const hasExp = Boolean(draft.expediente);
  return editable ? `
    <div class="gde-compact-row">
      <input type="checkbox" id="taskHasExpChk" ${hasExp ? "checked" : ""} />
      <span class="gde-compact-number ${hasExp ? "" : "muted"}" id="taskGdeCompactNumber">${hasExp ? escHtml(draft.expediente) : "Sin expediente asociado"}</span>
      ${hasExp ? `<a href="#" class="gde-link" data-gde-open="${escHtml(draft.expediente)}" title="Abrir en GDE">${icon("enlace", 12)}</a>` : ""}
      <button type="button" class="gde-compact-expand" id="taskGdeExpandBtn" title="${hasExp ? "Editar expediente" : "Agregar expediente"}">${icon("lapiz", 12)}</button>
    </div>
    <div data-gde-container class="hidden">${buildGdeToggleWidget(draft.expediente || "")}</div>`
    : `
    <div class="gde-compact-row">
      <span class="gde-compact-number ${hasExp ? "" : "muted"}">${hasExp ? escHtml(draft.expediente) : "Sin expediente asociado"}</span>
      ${hasExp ? `<a href="#" class="gde-link" data-gde-open="${escHtml(draft.expediente)}" title="Abrir en GDE">${icon("enlace", 12)}</a>` : ""}
    </div>`;
}

function wireExpedienteTabEvents(draft, mode) {
  els.taskForm.querySelectorAll('.task-pane[data-task-pane="expediente"] [data-gde-open]').forEach((a) => {
    a.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); openGDE(a.dataset.gdeOpen); });
  });
  if (mode !== "edit") return;
  const gdeContainer = els.taskForm.querySelector('.task-pane[data-task-pane="expediente"] [data-gde-container]');
  if (gdeContainer) wireGdeToggleWidget(gdeContainer.querySelector("[data-gde-toggle]"), draft.expediente || "", "pegar", "tarea-");

  const hasExpChk = document.getElementById("taskHasExpChk");
  const expandBtn = document.getElementById("taskGdeExpandBtn");
  const compactNumber = document.getElementById("taskGdeCompactNumber");
  hasExpChk?.addEventListener("change", () => {
    if (hasExpChk.checked) {
      gdeContainer?.classList.remove("hidden");
    } else {
      gdeContainer?.classList.add("hidden");
      const hidden = document.getElementById("tarea-gdeNumeroHidden");
      if (hidden) hidden.value = "";
      if (compactNumber) { compactNumber.textContent = "Sin expediente asociado"; compactNumber.classList.add("muted"); }
    }
  });
  expandBtn?.addEventListener("click", () => {
    const willShow = gdeContainer?.classList.contains("hidden");
    gdeContainer?.classList.toggle("hidden");
    if (willShow && hasExpChk && !hasExpChk.checked) hasExpChk.checked = true;
  });
  ["input", "change"].forEach((evt) => gdeContainer?.addEventListener(evt, () => {
    const hidden = document.getElementById("tarea-gdeNumeroHidden");
    if (!compactNumber || !hidden) return;
    const val = hidden.value.trim();
    compactNumber.textContent = val || "Sin expediente asociado";
    compactNumber.classList.toggle("muted", !val);
  }));
}

// Planillas queda config-only por ahora (fase 5): sin sync real, solo
// muestra el link vinculado a la pizarra si ya existe.
function buildPlanillasTabHtml() {
  const url = state.pizarraActual?.accesorios?.planillas?.url;
  return `
    <div class="task-section">
      <p style="color:var(--muted);font-size:13px">Todavia no hay datos sincronizados de una planilla para este tema.</p>
      ${url
        ? `<p style="font-size:13px">Planilla vinculada a esta pizarra: <a href="${escHtml(url)}" target="_blank" rel="noopener" class="link">${escHtml(url)}</a></p>`
        : `<p style="color:var(--muted);font-size:12.5px">Esta pizarra todavia no tiene una planilla vinculada.</p>`}
    </div>`;
}

// =========================================================
// Task modal — Tab "Documentos"
// =========================================================
// Documentos son objetos {id, nombre, storagePath, ...}. Enlace de descarga
// via signed URL generada al hacer clic.
function renderDocItem(d, opts = {}) {
  const { showDelete = false } = opts;
  const nombre = d && d.nombre ? d.nombre : String(d || "");
  const id = d && d.id ? d.id : "";
  const puedeBorrar = showDelete && id && (esAdmin() || (d.uploadedBy && d.uploadedBy === activeUserId()));
  return `<div class="doc-item">
    <span>${icon("documento", 14)} ${escHtml(nombre)}</span>
    ${id ? `<a href="#" class="link" data-doc-download="${id}" style="margin-left:8px">Ver / descargar</a>` : ""}
    ${puedeBorrar ? `<a href="#" class="link" data-doc-delete="${id}" style="margin-left:8px;color:#dc2626">Eliminar</a>` : ""}
  </div>`;
}

// onDeleted (opcional): callback tras un borrado exitoso, para que el
// caller actualice su propia lista local (draft.documentos, ex.documentos,
// etc) -- wireDocDownloads solo toca el state global compartido.
function wireDocDownloads(container, onDeleted) {
  if (!container) return;
  container.querySelectorAll("[data-doc-download]").forEach((a) => {
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      const doc = state.documentos.find((x) => x.id === a.dataset.docDownload);
      if (!doc || !doc.storagePath) { showToast("Documento no disponible"); return; }
      await withBusy(async () => {
        const url = await dataApi.getDocumentoUrl(doc.storagePath);
        window.open(url, "_blank", "noopener");
      });
    });
  });
  container.querySelectorAll("[data-doc-delete]").forEach((a) => {
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      const doc = state.documentos.find((x) => x.id === a.dataset.docDelete);
      if (!doc) return;
      if (!confirm(`¿Eliminar "${doc.nombre}"? Esta acción no se puede deshacer.`)) return;
      await withBusy(async () => {
        await dataApi.deleteDocumento(doc);
        state.documentos = state.documentos.filter((x) => x.id !== doc.id);
        onDeleted?.(doc);
      });
    });
  });
}

function buildDocumentosTabHtml(tema, mode) {
  const docHtml = tema.documentos.length
    ? tema.documentos.map((d) => renderDocItem(d, { showDelete: true })).join("")
    : `<p style="color:var(--muted)">Sin documentos adjuntos.</p>`;
  return `
    <div id="taskDocList">${docHtml}</div>
    ${mode === "edit" && puedeEditar() ? `<button type="button" class="col-add" id="taskUploadDocBtn" style="margin-top:10px">${icon("adjunto", 14)} Adjuntar documento</button>` : ""}
  `;
}

function wireDocumentosTabEvents(draft, mode) {
  wireDocDownloads(document.getElementById("taskDocList"), (doc) => {
    draft.documentos = draft.documentos.filter((x) => x.id !== doc.id);
    dataApi.logActivity(draft.id, `Documento eliminado: ${doc.nombre}`).catch(() => {});
    renderAll();
    refreshTaskDocumentosPane(draft, mode);
  });
  const btn = document.getElementById("taskUploadDocBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (!isPersistedTema(draft)) { showToast("Guarda el tema antes de adjuntar documentos."); return; }
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      await withBusy(async () => {
        const doc = await dataApi.uploadDocumento(file, { relacionadoTipo: "tema", temaId: draft.id });
        await dataApi.logActivity(draft.id, `Documento adjuntado: ${file.name}`);
        draft.documentos.push(doc);
        state.documentos.push(doc);
        renderAll();
        refreshTaskDocumentosPane(draft, mode);
      });
    };
    input.click();
  });
}

function refreshTaskDocumentosPane(draft, mode) {
  const pane = els.taskForm.querySelector('.task-pane[data-task-pane="documentos"]');
  if (!pane) return;
  pane.innerHTML = buildDocumentosTabHtml(draft, mode);
  wireDocumentosTabEvents(draft, mode);
  const tabBtn = els.taskForm.querySelector('.task-tab[data-task-tab="documentos"]');
  if (tabBtn) tabBtn.textContent = `Documentos${draft.documentos.length ? ` (${draft.documentos.length})` : ""}`;
}

// =========================================================
// Task modal — shell (tabs + header + footer) and entry point
// =========================================================
function wireTaskModalTabs() {
  els.taskForm.querySelectorAll(".task-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      els.taskForm.querySelectorAll(".task-tab").forEach((t) => t.classList.remove("active"));
      els.taskForm.querySelectorAll(".task-pane").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const pane = els.taskForm.querySelector(`.task-pane[data-task-pane="${tab.dataset.taskTab}"]`);
      if (pane) pane.classList.add("active");
      if (tab.dataset.taskTab === "general") autoResizeTextarea(document.getElementById("taskNombreInput"));
    });
  });
}

// Boton candado del header: reemplaza al viejo checkbox "Tema privado" del
// tab General (rediseno v2.5). Mismo criterio de permiso que antes (ver
// esCreadorPizarra): solo el creador de la pizarra puede tocarlo, y solo en
// modo edicion — el resto ve un indicador estatico si el tema es privado, o
// nada si no lo es (no hay nada que mostrar). El valor viaja en un input
// oculto name="privado" para que siga entrando por FormData en el onsubmit
// existente sin tocar esa logica mas de lo necesario.
// Badge de estado del header en modo vista (rediseno v2.5): a diferencia del
// badge generico usado en tablas/kanban (ver badge()), este lleva icono +
// flecha como en el mockup aprobado — clic entra a modo edicion (mismo path
// que el boton "Editar" del footer), asi la flecha no es una promesa vacia.
function estadoHeaderBadgeHtml(estado) {
  return `
    <button type="button" class="task-modal-estado-badge ${badgeClass(estado)}" id="taskEstadoBadgeBtn" title="Cambiar estado">
      ${icon("rayo", 14)}
      <span>${escHtml(estado)}</span>
      ${icon("chevronAbajo", 12)}
    </button>`;
}

function lockButtonHtml(draft, mode) {
  const locked = Boolean(draft.privado);
  const interactive = mode === "edit" && esCreadorPizarra();
  if (!interactive && !locked) return "";
  if (interactive) {
    const label = locked ? "Privado — clic para hacer publico" : "Publico — clic para hacer privado";
    return `
      <input type="hidden" name="privado" id="taskPrivadoInput" value="${locked ? "1" : ""}" />
      <button type="button" class="lock-btn ${locked ? "locked" : ""}" id="taskPrivadoBtn" title="${label}">${icon(locked ? "candado" : "candadoAbierto", 16)}</button>`;
  }
  return `<span class="lock-btn locked static" title="Privado — solo lo puede ver el creador de la pizarra">${icon("candado", 16)}</span>`;
}

// El modal unifica vista (readonly) y edicion. `initialMode` decide con que modo
// abre; "Editar"/"Cancelar" alternan entre ambos sin cerrar la ventana ni perder
// los tabs Documentos/accesorios ya cargados (esos se persisten al toque, no
// dependen de Guardar/Cancelar de la seccion General). El panel de Actividad
// no es una tab — vive siempre visible, ver buildFeedPanelHtml.
function renderTaskFormShell(draft, isEdit, initialMode) {
  let mode = initialMode || (isEdit ? "view" : "edit");
  let tareaSnapshot = mode === "edit" ? snapshotTareaFields(draft) : null;

  function currentTab() {
    return els.taskForm.querySelector(".task-tab.active")?.dataset.taskTab || "general";
  }

  function footerHtml() {
    if (mode === "view") {
      return `
        ${puedeEliminar() ? `<button type="button" class="btn-delete" id="taskDeleteBtn">Eliminar</button>` : "<span></span>"}
        ${puedeEditar() ? `<button type="button" class="primary" id="taskEditBtn">Editar</button>` : ""}
      `;
    }
    return `
      <button type="button" class="ghost" id="taskModalCancelBtn">Cancelar</button>
      ${puedeEditar() ? `<button class="primary" value="submit">Guardar cambios</button>` : ""}
    `;
  }

  function enterEditMode(focusEstado) {
    const tab = currentTab();
    mode = "edit";
    tareaSnapshot = snapshotTareaFields(draft);
    render(tab);
    if (focusEstado) els.taskForm.querySelector('[name="estado"]')?.focus();
  }

  function wireFooterEvents() {
    if (mode === "view") {
      document.getElementById("taskEditBtn")?.addEventListener("click", () => enterEditMode(false));
      document.getElementById("taskEstadoBadgeBtn")?.addEventListener("click", () => enterEditMode(true));
      document.getElementById("taskDeleteBtn")?.addEventListener("click", async () => {
        if (!confirm("Eliminar este tema? Esta accion no se puede deshacer.")) return;
        await withBusy(async () => {
          await dataApi.deleteTema(draft.id);
          els.modalTask.close();
          await reloadState();
        });
      });
    } else {
      document.getElementById("taskModalCancelBtn").addEventListener("click", () => {
        if (!isEdit) { els.modalTask.close(); return; }
        const tab = currentTab();
        restoreTareaFields(draft, tareaSnapshot);
        mode = "view";
        render(tab);
      });
    }
  }

  function render(tab) {
    const activeTab = tab || "general";
    const editable = mode === "edit";
    const accesoriosTabs = [];
    if (accesorioHabilitado("expediente")) accesoriosTabs.push({ key: "expediente", label: `${icon("conectado", 12)} Expediente` });
    if (accesorioHabilitado("planillas")) accesoriosTabs.push({ key: "planillas", label: `${icon("conectado", 12)} Planillas` });
    const puedeConectarAccesorio = esCreadorPizarra() && accesoriosDisponiblesParaConectar().length > 0;

    els.taskForm.innerHTML = `
      <div class="task-modal-header">
        <span class="id-pill">${escHtml(draft.id)}</span>
        <div class="task-modal-title-wrap">
          ${editable
            ? `<textarea name="nombre" id="taskNombreInput" class="task-modal-title-input" rows="1" required>${escHtml(draft.nombre || "")}</textarea>
               <button type="button" class="task-modal-edit-pencil" id="taskTitleFocusBtn" title="Editar nombre">${icon("lapiz", 15)}</button>`
            : `<h3 class="task-modal-title" id="taskModalTitle">${escHtml(draft.nombre) || "Nuevo tema"}</h3>`}
        </div>
        <div class="task-modal-header-actions">
          ${lockButtonHtml(draft, mode)}
          ${editable
            ? `<select name="estado" class="task-modal-estado-select" data-estado="${escHtml(draft.estado)}">${STATES.map((s) => `<option ${draft.estado === s ? "selected" : ""}>${s}</option>`).join("")}</select>`
            : (puedeEditar() ? estadoHeaderBadgeHtml(draft.estado) : badge(draft.estado))}
          <button type="button" class="task-feed-toggle-btn" id="taskFeedToggleBtn" title="${feedPanelVisible ? "Ocultar actividad" : "Mostrar actividad"}" aria-label="Mostrar u ocultar actividad">${icon("comentario", 16)}</button>
          <button type="button" class="task-modal-close" id="taskModalCloseBtn" aria-label="Cerrar">${icon("cerrar", 14)}</button>
        </div>
      </div>

      <div class="task-modal-body">
        <div class="task-modal-main">
          <div class="task-modal-tabs">
            <button type="button" class="task-tab ${activeTab === "general" ? "active" : ""}" data-task-tab="general">General</button>
            <button type="button" class="task-tab ${activeTab === "documentos" ? "active" : ""}" data-task-tab="documentos">Documentos${draft.documentos.length ? ` (${draft.documentos.length})` : ""}</button>
            ${accesoriosTabs.map((a) => `<button type="button" class="task-tab ${activeTab === a.key ? "active" : ""}" data-task-tab="${a.key}">${a.label}</button>`).join("")}
            ${puedeConectarAccesorio ? `<button type="button" class="task-tab-add" id="taskConectarAccesorioBtn" title="Conectar un accesorio">+</button>` : ""}
          </div>

          <div class="task-modal-content">
            <div class="task-pane ${activeTab === "general" ? "active" : ""}" data-task-pane="general">${buildGeneralTabHtml(draft, mode)}</div>
            <div class="task-pane ${activeTab === "documentos" ? "active" : ""}" data-task-pane="documentos">${buildDocumentosTabHtml(draft, mode)}</div>
            ${accesorioHabilitado("expediente") ? `<div class="task-pane ${activeTab === "expediente" ? "active" : ""}" data-task-pane="expediente">${buildExpedienteTabHtml(draft, mode)}</div>` : ""}
            ${accesorioHabilitado("planillas") ? `<div class="task-pane ${activeTab === "planillas" ? "active" : ""}" data-task-pane="planillas">${buildPlanillasTabHtml()}</div>` : ""}
          </div>
        </div>
        ${buildFeedPanelHtml(draft, mode)}
      </div>

      <div class="task-modal-footer ${editable ? "" : "footer-view"}">${footerHtml()}</div>
    `;

    wireTaskModalTabs();
    wireGeneralTabEvents(draft, mode);
    wireHitosListButtons(draft, mode);
    wireHitoDragReorder(draft, mode);
    wireGanttZoom(draft);
    wireAccordionToggle("datos");
    wireAccordionToggle("hitos");
    wireAccordionToggle("gantt");
    if (editable) wireAddHitoInline(draft);
    wireDocumentosTabEvents(draft, mode);
    if (accesorioHabilitado("expediente")) wireExpedienteTabEvents(draft, mode);
    wireFeedPanel(draft, mode);
    document.getElementById("taskConectarAccesorioBtn")?.addEventListener("click", openConectarAccesorioModal);

    document.getElementById("taskModalCloseBtn").addEventListener("click", () => els.modalTask.close());
    wireFooterEvents();
  }

  els.taskForm.onsubmit = async (e) => {
    e.preventDefault();
    if (mode !== "edit" || !puedeEditar()) return;
    const resp = getSelectedResp(els.taskForm);
    const estadoVal = els.taskForm.querySelector('[name="estado"]')?.value || draft.estado;
    // Pendiente admite quedar sin responsable (se muestra "Sin responsable");
    // cualquier otro estado lo requiere.
    if (!resp && estadoVal !== "Pendiente") { showToast("Selecciona al menos un responsable"); return; }
    const nombreVal = (els.taskForm.querySelector('[name="nombre"]')?.value || "").trim();
    if (!nombreVal) { showToast("El nombre del tema es requerido"); return; }
    const data = Object.fromEntries(new FormData(els.taskForm).entries());
    data.responsable = resp;
    // El input oculto de privacidad (boton candado del header) solo existe en
    // el DOM para el creador de la pizarra (ver lockButtonHtml) — si no esta,
    // se preserva el valor actual en vez de asumir false (evita que un editor
    // no-creador lo desmarque sin querer al no tener control para tocarlo).
    const privadoInputEl = els.taskForm.querySelector('[name="privado"]');
    data.privado = privadoInputEl ? privadoInputEl.value === "1" : draft.privado;
    const hasExp = document.getElementById("taskHasExpChk")?.checked;
    const gdeHidden = document.getElementById("tarea-gdeNumeroHidden");
    data.expediente = hasExp ? (gdeHidden ? gdeHidden.value.trim() : (draft.expediente || "")) : "";
    delete data.numero;

    Object.assign(draft, data);
    // El <select name="estado"> sigue ofreciendo nombres (STATES); se resuelve
    // a la columna real de la pizarra actual para persistir columna_id.
    const selCol = state.columnas.find((c) => c.nombre === draft.estado);
    if (selCol) { draft.columnaId = selCol.id; draft.esInicial = selCol.esInicial; draft.esFinal = selCol.esFinal; }
    draft.ultimaActualizacion = fmtDate(new Date());
    if (draft.estado === "Cerrado") {
      if (!draft.fechaCierre) {
        draft.fechaCierre = fmtDate(new Date());
        draft.cerradoPor = activeUserName();
      }
    } else if (draft.fechaCierre) {
      // Se revierte el cierre: limpiar fechaCierre para que los dias
      // restantes vuelvan a contar contra hoy.
      draft.fechaCierre = "";
      draft.cerradoPor = "";
    }

    const submitBtn = els.taskForm.querySelector('[value="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    // Solo registra actividad si algun campo del tema realmente cambio --
    // tareaSnapshot se capturo al entrar en modo edicion (enterEditMode);
    // apretar "Guardar cambios" sin tocar nada no debe dejar un movimiento
    // fantasma en el feed.
    const huboCambios = isEdit && JSON.stringify(tareaSnapshot) !== JSON.stringify(snapshotTareaFields(draft));
    const ok = await withBusy(async () => {
      if (isEdit) {
        await dataApi.updateTema(draft.id, draft);
        if (huboCambios) await dataApi.logActivity(draft.id, "Tema editado");
      } else {
        draft.creadoPor = activeUserId();
        await dataApi.createTema(draft);
        await dataApi.logActivity(draft.id, "Tema creado");
        // Hitos agregados en memoria antes de guardar el tema nuevo.
        for (const h of (draft.hitos || [])) await dataApi.createHito(draft.id, h);
      }
      await reloadState();
    });
    if (submitBtn) submitBtn.disabled = false;
    if (!ok) return;

    if (isEdit) {
      mode = "view";
      render(currentTab());
    } else {
      els.modalTask.close();
    }
  };

  render("general");
}

async function openTemaForm(existing = null, defaultEstado = "Pendiente", opts = {}) {
  const isEdit = Boolean(existing);
  const defaultCol = state.columnas.find((c) => c.nombre === defaultEstado)
    || state.columnas.find((c) => c.esInicial)
    || state.columnas[0]
    || null;
  const draft = existing || {
    id: await nextTemaId(),
    nombre: "", solicitante: "", etiquetas: [],
    prioridad: "Media", responsable: state.config.currentUser,
    columnaId: defaultCol ? defaultCol.id : null,
    estado: defaultCol ? defaultCol.nombre : defaultEstado,
    esInicial: defaultCol ? defaultCol.esInicial : true,
    esFinal: defaultCol ? defaultCol.esFinal : false,
    expediente: "", gde: "",
    fechaInicio: fmtDate(new Date()), fechaLimite: fmtDate(new Date()),
    descripcion: "", privado: false,
    hitos: [], comentarios: [], documentos: [],
    historial: [{ event: "Tema creado", at: fmtDate(new Date()), by: activeUserName() }],
    ultimaActualizacion: fmtDate(new Date()),
    __persisted: false  // aun no existe en Supabase
  };
  const mode = opts.mode || (isEdit ? "view" : "edit");
  renderTaskFormShell(draft, isEdit, mode);
  els.modalTask.showModal();
  if (opts.activeTab) {
    const tabBtn = els.taskForm.querySelector(`.task-tab[data-task-tab="${opts.activeTab}"]`);
    if (tabBtn) tabBtn.click();
  }
}

// =========================================================
// Hito edit modal (separate, small dialog — dialog#modalForm)
// =========================================================
// Dialogo chico de edicion rapida (alcanzable p.ej. desde la fila de un hito
// en la tabla de Expedientes). No tiene UI de dependencias — eso vive en el
// panel expandible del tab "Hitos" del modal de tema. La fecha que se carga
// aca es fechaManual (el "ancla" cuando el hito no tiene predecesor o esta
// en modo 'fecha'); fechaInicio/fechaLimite se recalculan solas al guardar.
function openHitoForm(tema, existing = null, opts = {}) {
  const isEdit = Boolean(existing);
  const hasOwnExp = Boolean(existing?.expediente);
  els.dynamicForm.innerHTML = `
    <h3>${isEdit ? "Editar hito" : `Nuevo hito para ${tema.id}`}</h3>
    <label>Nombre<input name="nombre" value="${escHtml(existing?.nombre || "")}" required /></label>
    <div class="row">
      ${buildRespSelector(existing?.responsable || tema.responsable)}
      <label>Estado<select name="estado">${STATES.map((s) => `<option ${existing?.estado === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
    </div>
    <div class="row">
      <label>Vencimiento
        <span class="fecha-with-badge">
          <input type="date" name="fechaManual" id="hitoFechaLimiteInput" value="${existing?.fechaManual || existing?.fechaLimite || ""}" required />
          ${diasRestantesBadge(existing?.fechaLimite || "", existing?.estado === "Cerrado" ? existing?.fechaCierre : null, "hitoDiasBadge")}
        </span>
      </label>
      <label>Duración propia (días)<input type="number" name="duracionPropia" value="${existing?.duracionPropia ?? 4}" min="1" step="1" /></label>
    </div>
    ${existing?.predecesorId ? `<p class="gde-own-inherited">Este hito depende de otro — para tocar la dependencia usá el tab Hitos del tema.</p>` : ""}
    <label>Descripcion<textarea name="descripcion">${escHtml(existing?.descripcion || "")}</textarea></label>
    <label style="display:flex;flex-direction:row;align-items:center;gap:8px;font-size:13px;color:var(--text)">
      <input type="checkbox" id="hitoOwnExpChk" ${hasOwnExp ? "checked" : ""} style="width:auto" />
      Este hito tiene expediente propio
    </label>
    <p id="hitoExpInherited" class="gde-own-inherited ${hasOwnExp ? "hidden" : ""}">${tema.expediente ? `Sin expediente propio · hereda ${escHtml(tema.expediente)} del tema` : "Sin expediente propio · el tema tampoco tiene expediente asociado"}</p>
    <div id="hitoExpWrap" class="${hasOwnExp ? "" : "hidden"}">${buildGdeToggleWidget(existing?.expediente || "")}</div>
    <div class="btn-group">
      ${isEdit && puedeEliminar() ? `<button type="button" class="ghost" id="hitoDeleteBtn" style="color:#dc2626;margin-right:auto">${icon("papelera", 14)} Eliminar</button>` : ""}
      <button class="primary" value="submit">Guardar</button>
      <button class="ghost" type="button" id="hitoCancelBtn">Cancelar</button>
    </div>
  `;
  initRespDropdowns(els.dynamicForm);
  wireGdeToggleWidget(document.getElementById("hitoExpWrap").querySelector("[data-gde-toggle]"), existing?.expediente || "", "pegar", "hito-");
  const hitoEstadoSelect = els.dynamicForm.querySelector('[name="estado"]');
  const getHitoFechaCierre = () => {
    const currentEstado = hitoEstadoSelect ? hitoEstadoSelect.value : existing?.estado;
    return currentEstado === "Cerrado" ? (existing?.fechaCierre || fmtDate(new Date())) : null;
  };
  const updateHitoDiasBadge = wireDiasBadge(document.getElementById("hitoFechaLimiteInput"), document.getElementById("hitoDiasBadge"), getHitoFechaCierre);
  hitoEstadoSelect?.addEventListener("change", () => updateHitoDiasBadge && updateHitoDiasBadge());

  const ownExpChk = document.getElementById("hitoOwnExpChk");
  const expWrap = document.getElementById("hitoExpWrap");
  const inheritedMsg = document.getElementById("hitoExpInherited");
  ownExpChk.addEventListener("change", () => {
    expWrap.classList.toggle("hidden", !ownExpChk.checked);
    inheritedMsg.classList.toggle("hidden", ownExpChk.checked);
  });

  document.getElementById("hitoCancelBtn").addEventListener("click", () => els.modalForm.close());

  if (isEdit && puedeEliminar()) {
    document.getElementById("hitoDeleteBtn").addEventListener("click", () => {
      els.modalForm.close();
      deleteHito(tema, existing.id, opts);
    });
  }

  els.dynamicForm.onsubmit = async (e) => {
    e.preventDefault();
    const resp = getSelectedResp(els.dynamicForm);
    if (!resp) { showToast("Selecciona al menos un responsable"); return; }
    const data = Object.fromEntries(new FormData(els.dynamicForm).entries());
    data.responsable = resp;
    data.duracionPropia = Math.max(1, parseInt(data.duracionPropia, 10) || 4);
    const hiddenExp = document.getElementById("hito-gdeNumeroHidden");
    data.expediente = ownExpChk.checked ? (hiddenExp?.value.trim() || "") : "";
    delete data.numero;

    const persisted = isPersistedTema(tema);
    const targetHito = isEdit
      ? Object.assign(existing, data)
      : { id: nextHitoId(tema), predecesorId: null, tipoVinculo: null, modoFecha: "fecha", desfasajeDias: null, ...data };
    if (targetHito.estado === "Cerrado") {
      if (!targetHito.fechaCierre) targetHito.fechaCierre = fmtDate(new Date());
    } else if (targetHito.fechaCierre) {
      // Se revierte el cierre: limpiar fechaCierre para que los dias
      // restantes vuelvan a contar contra hoy.
      targetHito.fechaCierre = "";
    }

    if (!isEdit) tema.hitos.push(targetHito);
    const fechasAntes = new Map(tema.hitos.map((h) => [h.id, `${h.fechaInicio}|${h.fechaLimite}`]));
    calcularCascadaHitos(tema.hitos);
    const cambiados = tema.hitos.filter((h) => h.id === targetHito.id || fechasAntes.get(h.id) !== `${h.fechaInicio}|${h.fechaLimite}`);

    if (persisted) {
      const ok = await withBusy(async () => {
        if (isEdit) {
          for (const h of cambiados) await dataApi.updateHito(h.id, h);
          await dataApi.logActivity(tema.id, `Hito ${existing.id} editado`, { hitoId: existing.id });
        } else {
          await dataApi.createHito(tema.id, targetHito);
          await dataApi.logActivity(tema.id, "Hito agregado", { hitoId: targetHito.id });
        }
      });
      if (!ok) { if (!isEdit) tema.hitos.pop(); return; }
    }
    tema.historial.push({ event: isEdit ? `Hito ${existing.id} editado` : "Hito agregado", at: fmtDate(new Date()), by: activeUserName() });
    tema.ultimaActualizacion = fmtDate(new Date());
    els.modalForm.close();
    renderAll();
    if (opts.onSaved) opts.onSaved(); else openTemaFormById(tema.id, { activeTab: "general" });
  };
  els.modalForm.showModal();
}

async function deleteHito(tema, hitoId, opts = {}) {
  if (!confirm("Eliminar hito?")) return;
  if (isPersistedTema(tema)) {
    const ok = await withBusy(async () => {
      await dataApi.deleteHito(hitoId);
      await dataApi.logActivity(tema.id, `Hito ${hitoId} eliminado`, { hitoId });
    });
    if (!ok) return;
  }
  tema.hitos = tema.hitos.filter((h) => h.id !== hitoId);
  tema.historial.push({ event: `Hito ${hitoId} eliminado`, at: fmtDate(new Date()), by: activeUserName() });
  tema.ultimaActualizacion = fmtDate(new Date());
  renderAll();
  if (opts.onSaved) opts.onSaved(); else openTemaFormById(tema.id, { activeTab: "general" });
}

// =========================================================
// GDE número builder widget
// =========================================================
const GDE_TIPOS = ["EX","IF","NO","RE","DI","PV","DE","DP","NR","PE"];
const GDE_ECOSISTEMAS = ["APN","GCBA","PBA","CABA","PMN"];

function parseGdeNumero(numero) {
  const anioActual = String(new Date().getFullYear());
  const vacio = { tipo: "EX", anio: anioActual, num: "", ecosistema: "APN", reparticion: "" };
  if (!numero) return vacio;
  // Formato real: EX-2024-106335934--APN-SOP#MEC  (separador "--" entre número y ecosistema)
  const sepIdx = numero.indexOf("--");
  if (sepIdx !== -1) {
    const left  = numero.substring(0, sepIdx).split("-");
    const right = numero.substring(sepIdx + 2).split("-");
    return {
      tipo:        left[0]  || "EX",
      anio:        left[1]  || anioActual,
      num:         left[2]  || "",
      ecosistema:  right[0] || "APN",
      reparticion: right.slice(1).join("-") || ""
    };
  }
  // Fallback: separador " - " (formato antiguo) o guión simple
  const legacyIdx = numero.indexOf(" - ");
  if (legacyIdx !== -1) {
    const left  = numero.substring(0, legacyIdx).split("-");
    const right = numero.substring(legacyIdx + 3).split("-");
    return {
      tipo:        left[0]  || "EX",
      anio:        left[1]  || anioActual,
      num:         left[2]  || "",
      ecosistema:  right[0] || "APN",
      reparticion: right.slice(1).join("-") || ""
    };
  }
  // Fallback: guión simple (EX-2022-94776460-APN-CEFISU#MDS)
  const parts = numero.split("-");
  return {
    tipo:        parts[0] || "EX",
    anio:        parts[1] || anioActual,
    num:         parts[2] || "",
    ecosistema:  parts[3] || "APN",
    reparticion: parts.slice(4).join("-") || ""
  };
}

function buildGdeWidget(existingNumero, idPrefix = "") {
  const p = parseGdeNumero(existingNumero);
  const tipoOpts = GDE_TIPOS.map((t) => `<option ${p.tipo === t ? "selected" : ""}>${t}</option>`).join("");
  const ecoOpts  = GDE_ECOSISTEMAS.map((e) => `<option ${p.ecosistema === e ? "selected" : ""}>${e}</option>`).join("");
  return `
    <fieldset class="gde-widget">
      <legend>Número de expediente GDE</legend>
      <div class="gde-parts">
        <label class="gde-part-label">
          <span>Tipo</span>
          <select id="${idPrefix}gdeTipo" class="gde-part-input" style="width:72px">${tipoOpts}</select>
        </label>
        <span class="gde-dash">-</span>
        <label class="gde-part-label">
          <span>Año</span>
          <input id="${idPrefix}gdeAnio" class="gde-part-input" value="${escHtml(p.anio)}" maxlength="4" style="width:62px;text-align:center" />
        </label>
        <span class="gde-dash">-</span>
        <label class="gde-part-label">
          <span>Número</span>
          <input id="${idPrefix}gdeNum" class="gde-part-input" value="${escHtml(p.num)}" placeholder="12345678" style="width:116px;text-align:center" />
        </label>
        <span class="gde-dash gde-dash-wide">--</span>
        <label class="gde-part-label">
          <span>Ecosistema</span>
          <select id="${idPrefix}gdeEco" class="gde-part-input" style="width:72px">${ecoOpts}</select>
        </label>
        <span class="gde-dash">-</span>
        <label class="gde-part-label">
          <span>Repartición</span>
          <input id="${idPrefix}gdeRep" class="gde-part-input" value="${escHtml(p.reparticion)}" placeholder="DGDA#MEC" style="width:130px" />
        </label>
      </div>
      <div class="gde-preview-row">
        <span class="gde-preview-label">Número completo:</span>
        <code id="${idPrefix}gdePreviewCode" class="gde-preview-code">${escHtml(existingNumero || "—")}</code>
        <button type="button" id="${idPrefix}btnGdeWidgetOpen" class="action gde-form-btn">${icon("enlace", 14)} Buscar en GDE</button>
      </div>
      <input type="hidden" name="numero" id="${idPrefix}gdeNumeroHidden" value="${escHtml(existingNumero || "")}" />
    </fieldset>`;
}

function wireGdeWidget(idPrefix = "") {
  const fields = ["gdeTipo","gdeAnio","gdeNum","gdeEco","gdeRep"].map((f) => idPrefix + f);
  const update = () => {
    const v = (id) => (document.getElementById(id)?.value || "").trim().toUpperCase();
    const tipo = v(`${idPrefix}gdeTipo`), anio = v(`${idPrefix}gdeAnio`), num = v(`${idPrefix}gdeNum`);
    const eco  = v(`${idPrefix}gdeEco`),  rep  = v(`${idPrefix}gdeRep`);
    const left  = [tipo, anio, num].filter(Boolean).join("-");
    const right = [eco, rep].filter(Boolean).join("-");
    // Separador "--" (doble guión) entre número y ecosistema
    const full = left && right ? `${left}--${right}` : left || right;
    const preview = document.getElementById(`${idPrefix}gdePreviewCode`);
    const hidden  = document.getElementById(`${idPrefix}gdeNumeroHidden`);
    if (preview) preview.textContent = full || "—";
    if (hidden)  hidden.value = full;
  };
  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", update);
    if (el) el.addEventListener("change", update);
  });
  const btnGde = document.getElementById(`${idPrefix}btnGdeWidgetOpen`);
  if (btnGde) {
    btnGde.addEventListener("click", () => {
      const num = document.getElementById(`${idPrefix}gdeNumeroHidden`)?.value.trim();
      if (num) openGDE(num);
      else showToast("Completa el número de expediente primero");
    });
  }
  update();
}

// =========================================================
// GDE toggle widget — "Pegar número" / "Armar por partes"
// =========================================================
function buildGdeToggleWidget(existingNumero, initialMode) {
  const mode = initialMode || "pegar";
  return `
    <div class="gde-toggle-wrap" data-gde-toggle>
      <div class="gde-mode-toggle">
        <button type="button" class="gde-mode-btn ${mode === "pegar" ? "active" : ""}" data-gde-mode-btn="pegar">Pegar número</button>
        <button type="button" class="gde-mode-btn ${mode === "armar" ? "active" : ""}" data-gde-mode-btn="armar">Armar por partes</button>
      </div>
      <div class="gde-mode-body" data-gde-mode-body></div>
    </div>`;
}

function renderGdeModeBody(wrap, mode, numero, idPrefix = "") {
  const body = wrap.querySelector("[data-gde-mode-body]");
  if (!body) return;
  if (mode === "armar") {
    body.innerHTML = buildGdeWidget(numero, idPrefix);
    wireGdeWidget(idPrefix);
  } else {
    body.innerHTML = `
      <div class="gde-paste-row">
        <input type="text" class="gde-paste-input" id="${idPrefix}gdePasteInput" placeholder="EX-2024-106335934--APN-SOP#MEC" value="${escHtml(numero || "")}" />
        <button type="button" class="action gde-form-btn" id="${idPrefix}btnGdeVerificar">${icon("enlace", 14)} Verificar</button>
      </div>
      <div class="gde-preview-row">
        <span class="gde-preview-label">Número completo:</span>
        <code id="${idPrefix}gdePreviewCode" class="gde-preview-code">${escHtml(numero || "—")}</code>
      </div>
      <input type="hidden" name="numero" id="${idPrefix}gdeNumeroHidden" value="${escHtml(numero || "")}" />`;
    wireGdePasteMode(idPrefix);
  }
}

function wireGdePasteMode(idPrefix = "") {
  const input = document.getElementById(`${idPrefix}gdePasteInput`);
  const hidden = document.getElementById(`${idPrefix}gdeNumeroHidden`);
  const preview = document.getElementById(`${idPrefix}gdePreviewCode`);
  if (!input || !hidden || !preview) return;
  const update = () => {
    const raw = input.value.trim();
    if (!raw) { hidden.value = ""; preview.textContent = "—"; return; }
    const p = parseGdeNumero(raw);
    const left = [p.tipo, p.anio, p.num].filter(Boolean).join("-");
    const right = [p.ecosistema, p.reparticion].filter(Boolean).join("-");
    const full = left && right ? `${left}--${right}` : (left || right);
    hidden.value = full || raw;
    preview.textContent = hidden.value || "—";
  };
  input.addEventListener("input", update);
  const btn = document.getElementById(`${idPrefix}btnGdeVerificar`);
  if (btn) {
    btn.addEventListener("click", () => {
      const num = hidden.value.trim();
      if (num) openGDE(num);
      else showToast("Completa el número de expediente primero");
    });
  }
  update();
}

function wireGdeToggleWidget(wrap, existingNumero, initialMode, idPrefix = "") {
  if (!wrap) return;
  let mode = initialMode || "pegar";
  renderGdeModeBody(wrap, mode, existingNumero, idPrefix);
  wrap.querySelectorAll("[data-gde-mode-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const newMode = btn.dataset.gdeModeBtn;
      if (newMode === mode) return;
      const currentHidden = document.getElementById(`${idPrefix}gdeNumeroHidden`);
      const currentNumero = currentHidden ? currentHidden.value.trim() : existingNumero;
      mode = newMode;
      wrap.querySelectorAll("[data-gde-mode-btn]").forEach((b) => b.classList.toggle("active", b.dataset.gdeModeBtn === mode));
      renderGdeModeBody(wrap, mode, currentNumero, idPrefix);
    });
  });
}

function openExpedienteForm(existing = null) {
  const isEdit = Boolean(existing);
  els.dynamicForm.innerHTML = `
    <h3>${isEdit ? "Editar expediente" : "Nuevo expediente"}</h3>
    ${buildGdeWidget(existing?.numero || "")}
    <div class="row">
      <label>Tema asociado<input name="temaAsociado" value="${escHtml(existing?.temaAsociado || "")}" /></label>
      ${buildRespSelector(existing?.responsable || state.config.currentUser)}
    </div>
    <div class="row">
      <label>Inicio<input type="date" name="fechaInicio" value="${existing?.fechaInicio || fmtDate(new Date())}" /></label>
      <label>Vencimiento<input type="date" name="fechaLimite" value="${existing?.fechaLimite || fmtDate(new Date())}" /></label>
    </div>
    <label>Estado<select name="estado">${["Activo","En revision","Cerrado"].map((s) => `<option ${existing?.estado === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
    <div class="btn-group">
      <button class="primary" value="submit">Guardar</button>
      <button class="ghost js-close-modal-form" type="button">Cancelar</button>
    </div>
  `;
  wireGdeWidget();
  initRespDropdowns(els.dynamicForm);
  els.dynamicForm.onsubmit = async (e) => {
    e.preventDefault();
    const numero = document.getElementById("gdeNumeroHidden")?.value.trim();
    if (!numero) { showToast("Completa el número de expediente"); return; }
    const resp = getSelectedResp(els.dynamicForm);
    if (!resp) { showToast("Selecciona al menos un responsable"); return; }
    const data = Object.fromEntries(new FormData(els.dynamicForm).entries());
    data.numero = numero;
    data.responsable = resp;
    data.ultimaActualizacion = fmtDate(new Date());
    const ok = await withBusy(async () => {
      if (isEdit) {
        await dataApi.updateExpediente(existing.numero, data);
      } else {
        await dataApi.createExpediente(data);
      }
      await reloadState();
    });
    if (!ok) return;
    els.modalForm.close();
  };
  els.modalForm.showModal();
}

// =========================================================
// Responsables
// =========================================================
function nextRespId() {
  const nums = state.responsables.map((r) => parseInt(r.id.replace("R-",""), 10)).filter((n) => !isNaN(n));
  return `R-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3,"0")}`;
}

function respMatchesName(respStr, fullName) {
  if (!respStr || !fullName) return false;
  return respStr.split(",").map((s) => s.trim()).includes(fullName);
}

function getRespStats(fullName) {
  const temas = state.temas.filter((t) => respMatchesName(t.responsable, fullName));
  const hitosAsignados = state.temas.flatMap((t) => t.hitos).filter((h) => respMatchesName(h.responsable, fullName));
  const temasConHito = unique(state.temas.filter((t) => t.hitos.some((h) => respMatchesName(h.responsable, fullName))).map((t) => t.id));
  return { temas: temas.length, hitos: hitosAsignados.length, temasConHito: temasConHito.length };
}

function renderResponsables() {
  if (!els.respGrid) return;
  const isList = respViewMode === "lista";
  els.respTarjetas.classList.toggle("hidden", isList);
  els.respLista.classList.toggle("hidden", !isList);

  if (isList) {
    els.tbodyResponsables.innerHTML = state.responsables.map((r, idx) => {
      const fullName = [r.nombre, r.apellido].filter(Boolean).join(" ");
      const stats = getRespStats(fullName);
      const initials = [r.nombre[0], r.apellido?.[0]].filter(Boolean).join("").toUpperCase() || "?";
      const color = RESP_PALETTE[idx % RESP_PALETTE.length];
      return `<tr>
        <td><div style="display:flex;gap:8px;align-items:center"><div class="resp-avatar-sm" style="background:${color}">${initials}</div><span style="font-weight:500">${escHtml(fullName)}</span></div></td>
        <td>${r.cargo || "<span style='color:var(--muted)'>—</span>"}</td>
        <td>${r.dependencia || "<span style='color:var(--muted)'>—</span>"}</td>
        <td>${r.email || "<span style='color:var(--muted)'>—</span>"}</td>
        <td>${r.usuarioGDE || "<span style='color:var(--muted)'>—</span>"}</td>
        <td style="text-align:center">${stats.temas}</td>
        <td style="text-align:center">${stats.hitos}</td>
        <td><button class="ghost" data-resp-edit="${r.id}" style="font-size:12.5px">${icon("lapiz", 12)} Editar</button></td>
      </tr>`;
    }).join("");
    els.tbodyResponsables.querySelectorAll("[data-resp-edit]").forEach((btn) => {
      btn.addEventListener("click", () => { const r = state.responsables.find((x) => x.id === btn.dataset.respEdit); if (r) openResponsableForm(r); });
    });
    return;
  }

  els.respGrid.innerHTML = state.responsables.map((r, idx) => {
    const fullName = [r.nombre, r.apellido].filter(Boolean).join(" ");
    const stats = getRespStats(fullName);
    const initials = [r.nombre[0], r.apellido?.[0]].filter(Boolean).join("").toUpperCase() || "?";
    const color = RESP_PALETTE[idx % RESP_PALETTE.length];
    return `
      <div class="resp-card" data-resp-id="${r.id}">
        <button type="button" class="resp-card-edit" data-resp-edit="${r.id}" title="Editar">${icon("lapiz", 14)}</button>
        <div class="resp-card-head">
          <div class="resp-avatar-lg" style="background:${color}">${initials}</div>
          <div class="resp-info">
            <div class="resp-name">${escHtml(fullName)}</div>
            ${r.email ? `<div class="resp-email">${icon("correo", 12)} ${escHtml(r.email)}</div>` : `<div class="resp-email" style="color:#c0c9d8">Sin correo</div>`}
            ${r.cargo ? `<div class="resp-dep">${icon("maletin", 12)} ${escHtml(r.cargo)}</div>` : ""}
            ${r.dependencia ? `<div class="resp-dep">${icon("carpeta", 12)} ${escHtml(r.dependencia)}</div>` : ""}
            ${r.usuarioGDE ? `<div class="resp-dep">${icon("llave", 12)} GDE: ${escHtml(r.usuarioGDE)}</div>` : ""}
          </div>
        </div>
        <hr class="resp-divider" />
        <div class="resp-stats">
          <div class="resp-stat"><strong>${stats.temas}</strong><small>Temas propios</small></div>
          <div class="resp-stat"><strong>${stats.hitos}</strong><small>Hitos asignados</small></div>
          <div class="resp-stat"><strong>${stats.temasConHito}</strong><small>Temas con hitos</small></div>
        </div>
      </div>`;
  }).join("");

  els.respGrid.querySelectorAll("[data-resp-edit]").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); const r = state.responsables.find((x) => x.id === btn.dataset.respEdit); if (r) openResponsableForm(r); });
  });
}

function openResponsableForm(existing = null) {
  const isEdit = Boolean(existing);
  els.dynamicForm.innerHTML = `
    <h3>${isEdit ? "Editar responsable" : "Nuevo responsable"}</h3>
    <div class="row">
      <label>Nombre<input name="nombre" value="${escHtml(existing?.nombre || "")}" required /></label>
      <label>Apellido<input name="apellido" value="${escHtml(existing?.apellido || "")}" /></label>
    </div>
    <label>Correo electronico<input type="email" name="email" value="${escHtml(existing?.email || "")}" /></label>
    <div class="row">
      <label>Cargo<input name="cargo" value="${escHtml(existing?.cargo || "")}" /></label>
      <label>Dependencia<input name="dependencia" value="${escHtml(existing?.dependencia || "")}" /></label>
    </div>
    <label>Usuario GDE<input name="usuarioGDE" value="${escHtml(existing?.usuarioGDE || "")}" /></label>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      ${isEdit && esAdmin() ? `<button class="ghost" type="button" id="deleteRespBtn" style="color:#dc2626">Eliminar</button><span style="flex:1"></span>` : ""}
      <button class="primary" value="submit">Guardar</button>
      <button class="ghost js-close-modal-form" value="cancel" type="button">Cancelar</button>
    </div>
  `;
  if (isEdit && esAdmin()) {
    const delBtn = els.dynamicForm.querySelector("#deleteRespBtn");
    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        if (!confirm(`Eliminar a ${existing.nombre}?`)) return;
        const fullNameDel = [existing.nombre, existing.apellido].filter(Boolean).join(" ");
        await withBusy(async () => {
          await dataApi.deleteResponsable(existing.id, fullNameDel);
          els.modalForm.close();
          await reloadState();
        });
      });
    }
  }
  els.dynamicForm.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(els.dynamicForm).entries());
    if (!data.nombre || !data.nombre.trim()) { showToast("El nombre es requerido"); return; }
    await withBusy(async () => {
      if (isEdit) await dataApi.updateResponsable(existing.id, data);
      else await dataApi.createResponsable(data);
      els.modalForm.close();
      await reloadState();
    });
  };
  els.modalForm.showModal();
}

function openUsuarioForm() {
  // Con Supabase Auth las cuentas se crean por auto-registro (nunca guardamos
  // contrasenas). El admin no crea usuarios directamente: quedan activos
  // solos apenas se registran (ver handle_new_user, supabase/migrations/021)
  // y desde aca se les puede cambiar el rol o desactivarlos si hace falta.
  els.dynamicForm.innerHTML = `
    <h3>Alta de usuarios</h3>
    <p style="font-size:13.5px;line-height:1.6;color:var(--text)">
      Los usuarios se dan de alta ellos mismos desde la pantalla de inicio con
      <strong>"Crear cuenta"</strong> y quedan activos al instante, sin necesitar
      aprobacion. Una vez registrados vas a poder cambiarles el rol
      (Admin / Editor / Viewer) o desactivarlos desde la tabla de arriba.
    </p>
    <div class="btn-group" style="justify-content:flex-end">
      <button class="primary js-close-modal-form" type="button">Entendido</button>
    </div>
  `;
  els.dynamicForm.onsubmit = (e) => { e.preventDefault(); els.modalForm.close(); };
  els.modalForm.showModal();
}

// =========================================================
// Exports — Planilla (Excel/PDF), estructura validada en
// docs/reportes/template_reporte_temas.xlsx.xlsx
// =========================================================
const REPORTE_COLUMNAS = [
  "Fecha", "Nivel", "ID Tema", "Etiquetas", "Solicitante", "Importancia", "Provincia",
  "Municipio", "Hito / Tema", "Responsable", "Estado", "Expediente", "Dependencia",
  "Fecha de inicio", "Fecha de finalización", "Días restantes para su finalización",
  "Última actualización", "Fecha última act", "Vencido", "Privado"
];
const REPORTE_ESTADO_LABEL = {
  "Pendiente": "01 - Pendiente",
  "En curso": "02 - En curso",
  "En revision": "03 - En revisión",
  "Cerrado": "04 - Cerrado",
  "Bloqueado": "05 - Bloqueado"
};
const REPORTE_ESTADO_COLOR = {
  "Pendiente":   { fill: "FFFEE2E2", text: "FF991B1B" },
  "En curso":    { fill: "FFDBEAFE", text: "FF1D4ED8" },
  "En revision": { fill: "FFEDE9FE", text: "FF5B21B6" },
  "Cerrado":     { fill: "FFD1FAE5", text: "FF047857" },
  "Bloqueado":   { fill: "FFFEF3C7", text: "FF92400E" }
};
const REPORTE_TEMA_FILL = "FFD6E4F7";
const REPORTE_TEMA_TEXT = "FF1F3864";
const REPORTE_HEADER_FILL = "FF0B5394";

function reporteVencido(estado, fechaLimite) {
  if (!fechaLimite) return "-";
  return (estado !== "Cerrado" && daysUntil(fechaLimite) < 0) ? "Sí" : "No";
}

function reporteDiasRestantes(estado, fechaLimite) {
  if (estado === "Cerrado" || !fechaLimite) return "-";
  return daysUntil(fechaLimite);
}

// Fuente unica de verdad para las filas de la Planilla — la usan tanto el
// exportador Excel como el PDF. `nivel`/`estadoRaw`/`privadoRaw` quedan crudos
// para poder pintar colores; el resto ya viene formateado para mostrar.
function buildReporteRows(temas, secciones) {
  const sec = secciones || { resumen: true, temas: true, hitos: true, expedientes: false, actividad: false };
  const rows = [];
  temas.forEach((t) => {
    calcularCascadaHitos(t.hitos);
    if (sec.temas) {
      rows.push({
        nivel: "TEMA", estadoRaw: t.estado, privadoRaw: t.privado,
        Fecha: t.fechaInicio || "", "Nivel": "TEMA", "ID Tema": t.id,
        "Etiquetas": (t.etiquetas || []).map((e) => e.nombre).join(", "),
        "Solicitante": t.solicitante || "", "Importancia": t.prioridad || "",
        "Provincia": t.provincia || "", "Municipio": t.municipio || "",
        "Hito / Tema": t.nombre, "Responsable": t.responsable || "",
        "Estado": REPORTE_ESTADO_LABEL[t.estado] || t.estado,
        "Expediente": t.expediente || "", "Dependencia": "",
        "Fecha de inicio": t.fechaInicio || "", "Fecha de finalización": t.fechaLimite || "",
        "Días restantes para su finalización": reporteDiasRestantes(t.estado, t.fechaLimite),
        "Última actualización": t.descripcion || "", "Fecha última act": t.ultimaActualizacion || "",
        "Vencido": reporteVencido(t.estado, t.fechaLimite), "Privado": t.privado ? "Sí" : "No"
      });
    }
    if (sec.hitos) {
      t.hitos.forEach((h) => {
        let dependencia = "";
        if (h.predecesorId) {
          const pred = hitoPorId(t.hitos, h.predecesorId);
          if (pred) dependencia = `${pred.nombre} — ${h.tipoVinculo || "FC"}`;
        }
        rows.push({
          nivel: "HITO", estadoRaw: h.estado, privadoRaw: t.privado,
          Fecha: t.fechaInicio || "", "Nivel": "HITO", "ID Tema": t.id,
          "Etiquetas": "", "Solicitante": "", "Importancia": "", "Provincia": "", "Municipio": "",
          "Hito / Tema": h.nombre, "Responsable": h.responsable || t.responsable || "",
          "Estado": REPORTE_ESTADO_LABEL[h.estado] || h.estado,
          "Expediente": "", "Dependencia": dependencia,
          "Fecha de inicio": h.fechaInicio || "", "Fecha de finalización": h.fechaLimite || "",
          "Días restantes para su finalización": reporteDiasRestantes(h.estado, h.fechaLimite),
          "Última actualización": "", "Fecha última act": "",
          "Vencido": reporteVencido(h.estado, h.fechaLimite), "Privado": t.privado ? "Sí" : "No"
        });
      });
    }
  });
  return rows;
}

function reporteNombreArchivo(ext) {
  return `reporte_temas_${fmtDate(new Date())}.${ext}`;
}

// -------- Excel --------
async function generarPlanillaExcel(temas, secciones) {
  const sec = secciones || state.reportFilters.secciones;
  const rows = buildReporteRows(temas, sec);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Seguimiento-Hitos";
  wb.created = new Date();

  const headerStyle = (cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORTE_HEADER_FILL } };
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" }, name: "Arial" };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  };

  if (sec.resumen) {
    const ws = wb.addWorksheet("Resumen");
    ws.columns = [{ width: 32 }, { width: 14 }];
    ws.getCell("A1").value = "Indicador"; ws.getCell("B1").value = "Valor";
    ["A1", "B1"].forEach((a) => headerStyle(ws.getCell(a)));
    const temaRows = rows.filter((r) => r.nivel === "TEMA");
    const hitoRows = rows.filter((r) => r.nivel === "HITO");
    const porEstado = STATES.map((s) => [`  ${s}`, temaRows.filter((r) => r.estadoRaw === s).length]);
    let r = 2;
    ws.getCell(`A${r}`).value = "Temas por estado"; ws.getCell(`A${r}`).font = { bold: true }; r++;
    porEstado.forEach(([label, count]) => { ws.getCell(`A${r}`).value = label; ws.getCell(`B${r}`).value = count; r++; });
    ws.getCell(`A${r}`).value = "Temas vencidos"; ws.getCell(`B${r}`).value = temaRows.filter((x) => x.Vencido === "Sí").length; r++;
    ws.getCell(`A${r}`).value = "Hitos vencidos"; ws.getCell(`B${r}`).value = hitoRows.filter((x) => x.Vencido === "Sí").length; r++;
    ws.getCell(`A${r}`).value = "Temas con expediente"; ws.getCell(`B${r}`).value = temaRows.filter((x) => x.Expediente).length; r++;
    ws.getCell(`A${r}`).value = "Total de temas en este reporte"; ws.getCell(`B${r}`).value = temaRows.length;
  }

  if (sec.temas) {
    const ws = wb.addWorksheet("Seguimiento temas");
    ws.getRow(1).height = 12.75;
    REPORTE_COLUMNAS.forEach((col, i) => { const c = ws.getRow(2).getCell(i + 1); c.value = col; headerStyle(c); });
    ws.getRow(2).height = 48;
    ws.views = [{ state: "frozen", xSplit: 0, ySplit: 2 }];
    ws.columns = [10.53, 9.73, 16, 19.73, 29.13, 16.12, 19.59, 19.59, 73.58, 21, 17.15, 39.53, 39.53, 18.4, 18.4, 21, 32.4, 19.4, 12, 11].map((width) => ({ width }));
    rows.forEach((row, idx) => {
      const excelRow = idx + 3;
      REPORTE_COLUMNAS.forEach((col, i) => {
        const cell = ws.getRow(excelRow).getCell(i + 1);
        cell.value = row[col];
        if (["Fecha", "Fecha de inicio", "Fecha de finalización"].includes(col) && row[col]) {
          cell.value = new Date(`${row[col]}T00:00:00`);
          cell.numFmt = col === "Fecha" ? "dd/mm" : "dd/mm/yy";
        }
      });
      const estadoColor = REPORTE_ESTADO_COLOR[row.estadoRaw];
      const estadoCell = ws.getRow(excelRow).getCell(11);
      if (estadoColor) {
        estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: estadoColor.fill } };
        estadoCell.font = { color: { argb: estadoColor.text }, bold: row.nivel === "TEMA" };
      }
      if (row.nivel === "TEMA") {
        REPORTE_COLUMNAS.forEach((col, i) => {
          if (col === "Estado") return;
          const cell = ws.getRow(excelRow).getCell(i + 1);
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORTE_TEMA_FILL } };
          cell.font = { bold: true, color: { argb: REPORTE_TEMA_TEXT } };
        });
      }
    });
  }

  if (sec.expedientes) {
    const expedientesDelReporte = state.expedientes.filter((e) =>
      temas.some((t) => t.expediente === e.numero)
    );
    const ws = wb.addWorksheet("Expedientes");
    const cols = ["Número", "Tema asociado", "Responsable", "Estado", "Inicio", "Vencimiento", "Última actualización"];
    cols.forEach((col, i) => { const c = ws.getRow(1).getCell(i + 1); c.value = col; headerStyle(c); });
    ws.columns = [18, 30, 24, 14, 14, 14, 18].map((width) => ({ width }));
    expedientesDelReporte.forEach((e, idx) => {
      const row = ws.getRow(idx + 2);
      row.getCell(1).value = e.numero; row.getCell(2).value = e.temaAsociado;
      row.getCell(3).value = e.responsable; row.getCell(4).value = e.estado;
      row.getCell(5).value = e.fechaInicio; row.getCell(6).value = e.fechaLimite;
      row.getCell(7).value = e.ultimaActualizacion;
    });
  }

  if (sec.actividad) {
    const eventos = temas.flatMap((t) => (t.historial || []).map((h) => ({ ...h, temaId: t.id, temaNombre: t.nombre })))
      .sort((a, b) => (b.at || "").localeCompare(a.at || ""));
    const ws = wb.addWorksheet("Historial de actividad");
    const cols = ["Fecha", "Tema", "Evento", "Por"];
    cols.forEach((col, i) => { const c = ws.getRow(1).getCell(i + 1); c.value = col; headerStyle(c); });
    ws.columns = [14, 30, 40, 20].map((width) => ({ width }));
    eventos.forEach((ev, idx) => {
      const row = ws.getRow(idx + 2);
      row.getCell(1).value = ev.at; row.getCell(2).value = `${ev.temaId} — ${ev.temaNombre}`;
      row.getCell(3).value = ev.event; row.getCell(4).value = ev.by || "sistema";
    });
  }

  // Leyenda: texto fijo ya redactado, siempre incluida (no es un dato filtrable).
  const wsL = wb.addWorksheet("Leyenda");
  wsL.columns = [{ width: 19.26 }, { width: 74 }];
  const leyendaEstados = [
    ["01 - Pendiente", "El tema o hito está anotado pero todavía no arrancó ningún trabajo sobre él. No hay ningún impedimento externo: simplemente no se empezó, sea porque no llegó su turno de prioridad o porque su fecha de inicio prevista todavía no llegó.\nEjemplo: un hito recién creado que espera a que se libere el responsable, o un trámite que se sabe que hay que iniciar pero que aún no se gestionó."],
    ["02 - En curso", "Hay trabajo activo sucediendo ahora mismo: alguien lo está redactando, coordinando, auditando o ejecutando en este momento.\nEjemplo: el responsable está armando la documentación, coordinando una reunión, o la obra está en ejecución."],
    ["03 - En revisión", "El trabajo de fondo ya está terminado; lo único que falta es que un tercero lo revise, valide, apruebe o firme antes de poder cerrarlo. No depende de generar más contenido, sino de que alguien más lo mire.\nEjemplo: un informe redactado que espera la firma de un Secretario, o una rendición ya armada que está en poder de auditoría externa."],
    ["04 - Cerrado", "Está completado y no requiere ninguna acción adicional de nadie.\nEjemplo: expediente firmado y archivado, hito cumplido y verificado, reunión realizada y sin pendientes posteriores."],
    ["05 - Bloqueado", "No puede avanzar porque depende de un tercero o de algo externo que todavía no está resuelto. La diferencia con \"Pendiente\" es que acá ya se intentó avanzar pero hay un impedimento concreto identificado.\nEjemplo: el hito de elevación del expediente en T-002 es \"Bloqueado\" y no \"Pendiente\" porque está esperando que se apruebe la rendición contable —no es que no arrancó, es que está frenado por algo fuera del equipo."]
  ];
  const leyendaImportancia = [
    ["Alta", "Tiene alta exposición institucional: involucra a autoridades (Ministro, Secretarios, intendentes), compromisos públicos ya asumidos, o su demora genera un riesgo concreto -legal, presupuestario o de imagen-. Se prioriza por encima del resto de la agenda.\nEjemplo: pedido de reunión de un intendente, expediente con vencimiento normativo, compromiso ya comunicado públicamente."],
    ["Media", "Afecta la gestión habitual del área pero no compromete al Ministerio frente a terceros de forma crítica si se demora unos días. Tiene plazos, aunque con margen razonable de reprogramación.\nEjemplo: seguimiento de una obra en curso sin alertas activas, actualización de un convenio sin fecha límite inminente."],
    ["Baja", "Bajo impacto o urgencia: puede posponerse sin consecuencias relevantes ni para el área ni para terceros. Se resuelve cuando hay disponibilidad, sin correr al resto de la agenda.\nEjemplo: trámites administrativos de rutina, actualizaciones internas sin fecha de vencimiento definida."],
    ["Nota", "\"Importancia\" clasifica la prioridad de gestión del tema, no si está vencido. Un tema de Importancia Baja puede estar vencido igual (ver columna Vencido en \"Seguimiento temas\"), sin que eso lo vuelva Alta automáticamente."]
  ];
  wsL.mergeCells("A1:B1"); wsL.getCell("A1").value = "Estados"; headerStyle(wsL.getCell("A1"));
  let lr = 2;
  leyendaEstados.forEach(([a, b]) => { wsL.getCell(`A${lr}`).value = a; wsL.getCell(`B${lr}`).value = b; wsL.getCell(`B${lr}`).alignment = { wrapText: true, vertical: "top" }; lr++; });
  lr++;
  wsL.mergeCells(`A${lr}:B${lr}`); wsL.getCell(`A${lr}`).value = "Importancia"; headerStyle(wsL.getCell(`A${lr}`)); lr++;
  leyendaImportancia.forEach(([a, b]) => { wsL.getCell(`A${lr}`).value = a; wsL.getCell(`B${lr}`).value = b; wsL.getCell(`B${lr}`).alignment = { wrapText: true, vertical: "top" }; lr++; });

  const buffer = await wb.xlsx.writeBuffer();
  download(reporteNombreArchivo("xlsx"), buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

// -------- PDF --------
function generarPlanillaPdf(temas, secciones) {
  const sec = secciones || state.reportFilters.secciones;
  const rows = sec.temas || sec.hitos ? buildReporteRows(temas, sec) : [];
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(14);
  doc.text("Reporte de Temas — SSOyS", 24, 28);
  doc.setFontSize(9);
  doc.setTextColor(100);
  const nFiltros = reportFiltersCount(state.reportFilters);
  doc.text(`Generado: ${fmtDate(new Date())} · Usuario: ${state.config.currentUser} · ${nFiltros} filtro${nFiltros === 1 ? "" : "s"} activo${nFiltros === 1 ? "" : "s"} · ${temas.length} temas`, 24, 42);
  doc.setTextColor(0);

  if (rows.length) {
    autoTable(doc, {
      startY: 54,
      head: [REPORTE_COLUMNAS],
      body: rows.map((r) => REPORTE_COLUMNAS.map((c) => (r[c] === undefined || r[c] === null ? "" : String(r[c])))),
      styles: { fontSize: 6.5, cellPadding: 3 },
      headStyles: { fillColor: [11, 83, 148], textColor: 255, fontStyle: "bold" },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const row = rows[data.row.index];
        if (!row) return;
        if (row.nivel === "TEMA") {
          data.cell.styles.fillColor = [214, 228, 247];
          data.cell.styles.textColor = [31, 56, 100];
          data.cell.styles.fontStyle = "bold";
        }
        if (REPORTE_COLUMNAS[data.column.index] === "Estado") {
          const c = REPORTE_ESTADO_COLOR[row.estadoRaw];
          if (c) {
            data.cell.styles.fillColor = hexToRgb(c.fill);
            data.cell.styles.textColor = hexToRgb(c.text);
            data.cell.styles.fontStyle = row.nivel === "TEMA" ? "bold" : "normal";
          }
        }
      }
    });
  }

  doc.save(reporteNombreArchivo("pdf"));
}

function hexToRgb(argb) {
  const hex = argb.length === 8 ? argb.slice(2) : argb;
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

function download(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

// =========================================================
// Utils
// =========================================================
// state.temas solo trae los temas del tablero actual (fetchInitialState
// filtra por pizarra_id) pero temas.id es una PK global — calcular el
// proximo id contra ese state alcanza mientras hay un solo tablero, pero en
// un tablero nuevo (sin temas todavia) siempre da "T-001" y choca contra el
// de otro tablero. Se consulta la PK global real en vez de confiar en el
// state en memoria.
async function nextTemaId() {
  const max = await dataApi.getMaxTemaIdNum();
  return `T-${String(max + 1).padStart(3,"0")}`;
}
function nextDocId() {
  const ids = state.documentos.map((d) => parseInt(d.id.replace(/\D/g,""), 10) || 0);
  return `D-${String((Math.max(0,...ids)) + 1).padStart(3,"0")}`;
}

function countBy(arr, k) { return arr.reduce((acc, x) => { const v = x[k] || "Sin asignar"; acc[v] = (acc[v]||0)+1; return acc; }, {}); }
function sum(arr) { return arr.reduce((a, b) => a + b, 0); }
function objToText(o) { return Object.entries(o).map(([k,v]) => `${escHtml(k)}: ${v}`).join(" · "); }
function avgResolutionDays(temas) {
  const closed = temas.filter((t) => t.fechaCierre && t.fechaInicio);
  if (!closed.length) return 0;
  return Math.round(closed.reduce((acc, t) => acc + daysBetween(t.fechaInicio, t.fechaCierre), 0) / closed.length);
}

function daysUntil(d) { return daysBetween(fmtDate(new Date()), d); }
function daysBetween(a, b) {
  if (!a || !b) return 0;
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
}
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDateNice(s) {
  if (!s) return "-";
  const d = new Date(s + "T00:00:00");
  if (isNaN(d)) return s;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
}

function fmtDateTimeNice(s) {
  if (!s) return "—";
  const d = new Date(s.includes("T") ? s : s + "T00:00:00");
  if (isNaN(d)) return s;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

function fmtDateFeed(s) {
  if (!s) return "-";
  const d = new Date(s + "T00:00:00");
  if (isNaN(d)) return s;
  return d.toLocaleDateString("es", { day: "numeric", month: "short" });
}

function dateTone(s, estado) {
  if (estado === "Cerrado") return "tone-done";
  const d = daysUntil(s);
  if (d < 0) return "tone-red";
  if (d <= 3) return "tone-orange";
  if (d <= 7) return "tone-yellow";
  return "tone-blue";
}

function badge(s) { return `<span class="badge ${badgeClass(s)}">${escHtml(s)}</span>`; }
function badgeClass(s) { return `b-${(s||"").toLowerCase().replace(/\s+/g,"-")}`; }

import * as authApi from "./src/authApi.js";
import * as dataApi from "./src/dataApi.js";

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
        ${isSel ? `<span class="tagcolor-check" aria-hidden="true" style="color:${set.text}">✓</span>` : ""}
      </button>`;
    }).join("")}
  </div>`;
}

function etiquetaChipHtml(et, opts = {}) {
  const { bg, text } = resolveTagColor(et.color);
  return `<span class="etiqueta-chip${opts.compact ? " compact" : ""}" style="background:${bg};color:${text}" title="${escHtml(et.nombre)}">
    ${opts.compact ? "" : escHtml(et.nombre)}
    ${opts.removable ? `<button type="button" class="etiqueta-chip-remove" data-etiqueta-remove="${opts.index}" aria-label="Quitar etiqueta">✕</button>` : ""}
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
let state = {
  config: { currentUser: "", areaDefault: "SSOyS", rol: "Viewer" },
  temas: [], expedientes: [], responsables: [], documentos: [], usuarios: [], etiquetas: [],
  profile: null
};

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
function activeUserName() { return state.profile ? state.profile.nombre : state.config.currentUser; }
function activeUserId() { return state.profile ? state.profile.id : null; }

// --------- Persistencia / recarga desde Supabase ---------
async function reloadState() {
  const data = await dataApi.fetchInitialState();
  state.temas = data.temas;
  state.expedientes = data.expedientes;
  state.responsables = data.responsables;
  state.documentos = data.documentos;
  state.usuarios = data.usuarios;
  state.etiquetas = data.etiquetas;
  renderAll();
}

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
  notifDot:           $("notifDot"),
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
  respGrid:           $("respGrid"),
  respTarjetas:       $("respTarjetas"),
  respLista:          $("respLista"),
  tbodyResponsables:  $("tbodyResponsables"),
  cfgNombre:          $("cfgNombre"),
  cfgEmail:           $("cfgEmail"),
  cfgPassActual:      $("cfgPassActual"),
  cfgPassNueva:       $("cfgPassNueva"),
  cfgPassConfirmar:   $("cfgPassConfirmar"),
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
  calGrid:            $("calGrid"),
  calTitle:           $("calTitle"),
  boardMenuBtn:       $("boardMenuBtn"),
  boardMenu:          $("boardMenu"),
  boardMenuOverlay:   $("boardMenuOverlay"),
  boardMenuBack:      $("boardMenuBack"),
  boardMenuTitle:     $("boardMenuTitle"),
  boardMenuClose:     $("boardMenuClose"),
  boardMenuBody:      $("boardMenuBody")
};

let calCursor = new Date();
let drawerHasUnsavedChanges = false;
let currentDrawerTemaId = null;
let respViewMode = "tarjetas";
let showMisTemasOnly = false;

// =========================================================
// Init / events
// =========================================================
init();

function init() {
  initTheme();
  bindEvents();
  fillFilterOptions();
  boot();
}

// Resuelve la sesion de Supabase y decide que pantalla mostrar.
async function boot() {
  let session;
  try { session = await authApi.getSession(); }
  catch (e) { console.error(e); }

  if (!session) { showLoginScreen(); return; }

  let profile = null;
  try { profile = await authApi.loadProfile(); }
  catch (e) { console.error(e); }

  if (!profile) { showLoginScreen(); return; }
  if (!profile.aprobado) { showAccessNotice("pendiente"); return; }
  if (!profile.activo) { showAccessNotice("desactivada"); return; }

  state.profile = profile;
  state.config.currentUser = profile.nombre;
  state.config.rol = profile.rol;

  showApp();
  const ok = await withBusy(reloadState);
  if (ok) { authApi.touchLastAccess().catch(() => {}); }
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

  $("exportCsv").addEventListener("click", exportCsv);
  $("exportExcel").addEventListener("click", exportExcel);
  $("exportPdf").addEventListener("click", exportPdfLike);

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

  const logoutBtn = $("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (!confirm("Cerrar sesion?")) return;
      await withBusy(() => authApi.logout());
      state.profile = null;
      showLoginScreen();
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
}

function navigateTo(view) {
  document.querySelectorAll(".tab-item").forEach((m) => m.classList.remove("active"));
  const tab = document.querySelector(`.tab-item[data-view="${view}"]`);
  if (tab) tab.classList.add("active");
  showView(view);
}

function showLoginScreen() {
  const ls = $("loginScreen");
  const app = document.querySelector(".app");
  if (ls) { ls.style.display = "grid"; ls.style.placeItems = "center"; }
  if (app) app.style.display = "none";
  renderLogin();
}

function showApp() {
  const ls = $("loginScreen");
  const app = document.querySelector(".app");
  if (ls) ls.style.display = "none";
  if (app) app.style.display = "";
  updateHeaderForRole();
}

// Aviso en la pantalla de login para cuentas pendientes/desactivadas.
function showAccessNotice(kind) {
  const ls = $("loginScreen");
  const app = document.querySelector(".app");
  if (ls) { ls.style.display = "grid"; ls.style.placeItems = "center"; }
  if (app) app.style.display = "none";
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
    await withBusy(() => authApi.logout());
    state.profile = null;
    renderLogin();
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
      <button type="button" class="login-link" id="goRegister">Solicitar acceso</button>
    </form>`;
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
      <label>Nombre completo<input type="text" id="regNombre" required /></label>
      <label>Email<input type="email" id="regEmail" required /></label>
      <label>Contraseña<input type="password" id="regPass" required /></label>
      <label>Confirmar contraseña<input type="password" id="regPass2" required /></label>
      <div id="regMsg"></div>
      <button type="submit" class="login-btn">Solicitar acceso</button>
      <button type="button" class="login-link" id="goLogin">Volver al login</button>
    </form>`;
  $("goLogin").addEventListener("click", renderLogin);
  $("regFormEl").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("regMsg");
    const nombre = $("regNombre").value.trim();
    const email  = $("regEmail").value.trim().toLowerCase();
    const pass   = $("regPass").value;
    const pass2  = $("regPass2").value;
    if (pass !== pass2) { msg.innerHTML = `<div class="login-error">Las contraseñas no coinciden.</div>`; return; }
    if (pass.length < 6) { msg.innerHTML = `<div class="login-error">La contraseña debe tener al menos 6 caracteres.</div>`; return; }
    const btn = e.target.querySelector(".login-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }
    try {
      await authApi.register(nombre, email, pass);
      // Queda con sesion iniciada pero sin aprobar: cerramos para dejar el login limpio.
      await authApi.logout();
      state.profile = null;
      msg.innerHTML = `<div class="login-success">Tu solicitud fue enviada. El administrador debe aprobarla antes de que puedas ingresar.</div>`;
      setTimeout(() => renderLogin(), 3500);
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = "Solicitar acceso"; }
      const already = /registered|already/i.test(err && err.message ? err.message : "");
      msg.innerHTML = `<div class="login-error">${already ? "Ya existe un usuario con ese email." : "No se pudo completar el registro."}</div>`;
    }
  });
}

// =========================================================
// Usuarios view
// =========================================================
function renderUsuarios() {
  const tbActivos   = $("tableUsuariosActivos");
  const tbPendientes = $("tableUsuariosPendientes");
  if (!tbActivos) return;
  if (!esAdmin()) { tbActivos.innerHTML = ""; tbPendientes.innerHTML = ""; return; }

  const activos   = state.usuarios.filter((u) => u.aprobado && u.activo);
  const pendientes = state.usuarios.filter((u) => !u.aprobado);

  tbActivos.innerHTML = activos.map((u) => `
    <tr>
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
    </tr>`).join("") || `<tr><td colspan="5" style="color:var(--muted);text-align:center">Sin usuarios.</td></tr>`;

  tbActivos.querySelectorAll("[data-eliminar]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const u = state.usuarios.find((x) => x.id === btn.dataset.eliminar);
      if (u && confirm(`Eliminar a ${u.nombre} definitivamente?`)) {
        await withBusy(async () => { await dataApi.deleteProfile(u.id); await reloadState(); renderUsuarios(); });
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

  tbPendientes.innerHTML = pendientes.map((u) => `
    <tr>
      <td>${escHtml(u.nombre)}</td>
      <td>${escHtml(u.email)}</td>
      <td>${fmtDateNice(u.fechaRegistro)}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center">
          <select class="pill" style="font-size:12px;padding:3px 8px" id="rolAprobacion-${u.id}">
            ${["Admin","Editor","Viewer"].map((r) => `<option>${r}</option>`).join("")}
          </select>
          <button class="primary" style="font-size:12px;padding:4px 10px" data-aprobar="${u.id}">Aprobar</button>
          <button class="ghost" style="font-size:12px;color:#dc2626" data-rechazar="${u.id}">Rechazar</button>
        </div>
      </td>
    </tr>`).join("") || `<tr><td colspan="4" style="color:var(--muted);text-align:center">Sin solicitudes pendientes.</td></tr>`;

  tbPendientes.querySelectorAll("[data-aprobar]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const u = state.usuarios.find((x) => x.id === btn.dataset.aprobar);
      const rolSel = document.getElementById(`rolAprobacion-${u.id}`);
      if (u) await withBusy(async () => {
        await dataApi.approveProfile(u.id, rolSel ? rolSel.value : "Viewer");
        await reloadState();
        renderUsuarios();
        showToast(`${u.nombre} aprobado`);
      });
    });
  });
  tbPendientes.querySelectorAll("[data-rechazar]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const u = state.usuarios.find((x) => x.id === btn.dataset.rechazar);
      if (u && confirm(`Rechazar solicitud de ${u.nombre}?`)) {
        await withBusy(async () => { await dataApi.deleteProfile(u.id); await reloadState(); renderUsuarios(); });
      }
    });
  });
}

// =========================================================
// Filter helpers
// =========================================================
function unique(arr) { return [...new Set(arr.filter(Boolean))]; }

function fillFilterOptions() {
  const visibles = state.temas.filter(isTemaVisible);
  fillSelect(els.fResponsable, unique(visibles.map((t) => t.responsable)), "Responsable");
  fillSelect(els.fEstado, STATES, "Estado");
  fillSelect(els.fPrioridad, ["Alta", "Media", "Baja"], "Prioridad");
  // Solo etiquetas usadas en temas activos (no Cerrado), para no listar etiquetas muertas.
  const etiquetasActivas = unique(
    visibles.filter((t) => t.estado !== "Cerrado").flatMap((t) => (t.etiquetas || []).map((e) => e.nombre))
  );
  fillSelect(els.fEtiqueta, etiquetasActivas, "Etiquetas");
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

// =========================================================
// Render orchestrator
// =========================================================
function isKnownResp(singleName) {
  const n = (singleName || "").trim();
  if (!n) return false;
  return state.responsables.some((r) => [r.nombre, r.apellido].filter(Boolean).join(" ") === n);
}

function respDisplay(name) {
  if (!name || !name.trim()) return `<span class="resp-unassigned">⚠ Sin responsable</span>`;
  return name.split(",").map((s) => {
    const p = s.trim();
    if (!p) return "";
    if (!isKnownResp(p)) {
      return `<span class="resp-unknown" title="No registrado en la base de responsables">⚠ ${escHtml(p)}</span>`;
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
  renderDonut(els.donutResp, byResp, RESP_PALETTE, "donutResp", els.legendResp);
  renderDonut(els.donutEstado, byEstado, STATES.map((s) => STATE_COLORS[s]), "donutEstado", els.legendEstado, STATES);
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
  const alertCount = alerts.length;
  if (els.notifDot) els.notifDot.textContent = alertCount;
  const nivelIcon = { 4: "⛔", 3: "⚠", 2: "•", 1: "•" };
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
function renderAgenda() {
  const temas = getFilteredTemas();
  const cols = ["Pendiente", "En curso", "En revision", "Bloqueado", "Cerrado"];
  const labels = {
    "Pendiente":   "01 · Pendiente",
    "En curso":    "02 · En curso",
    "En revision": "03 · En revision",
    "Bloqueado":   "04 · Bloqueado",
    "Cerrado":     "05 · Cerrado"
  };

  els.agendaKanban.innerHTML = cols.map((estado) => {
    const items = temas.filter((t) => t.estado === estado);
    const safe = estado.replace(/\s+/g, "-");
    return `
      <section class="col col-${safe}" data-estado="${estado}">
        <div class="col-head">
          <span>${labels[estado]}</span>
          <span class="col-count">${items.length}</span>
        </div>
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
                <button type="button" class="kcard-actions-btn" draggable="false" data-kcard-menu-btn title="Acciones" aria-label="Acciones">⋯</button>
                ${t.etiquetas && t.etiquetas.length ? `<div class="etiquetas-chips">${t.etiquetas.map((et) => etiquetaChipHtml(et, { compact: !etiquetasExpandidas })).join("")}</div>` : ""}
                <div class="title">${t.privado ? "🔒 " : ""}${escHtml(t.nombre)}</div>
                <div class="kcard-meta-row">
                  <span class="meta">${t.id}</span>
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
        ${puedeEditar() ? `<button class="col-add" data-add-estado="${estado}">+ Agregar tema</button>` : ""}
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
      const orderedIds = Array.from(col.querySelectorAll(".kcard")).map((c) => c.dataset.id);
      await withBusy(async () => {
        if (tema && tema.estado !== nuevoEstado) {
          let extra = {};
          if (nuevoEstado === "Cerrado") {
            extra = { fecha_cierre: fmtDate(new Date()), cerrado_por: activeUserName() };
          } else if (tema.estado === "Cerrado") {
            // Se revierte el cierre: la fecha de cierre se limpia para que
            // los dias restantes vuelvan a contar contra hoy.
            extra = { fecha_cierre: null, cerrado_por: null };
          }
          await dataApi.updateTemaEstado(id, nuevoEstado, extra);
          await dataApi.logActivity(id, `Cambio a ${nuevoEstado}`);
        }
        await dataApi.reorderTemas(orderedIds);
        await reloadState();
      });
    });
  });
  els.agendaKanban.querySelectorAll("[data-add-estado]").forEach((btn) => {
    btn.addEventListener("click", () => openTemaForm(null, btn.dataset.addEstado));
  });
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
  const nuevoId = nextTemaId();
  const draft = {
    id: nuevoId,
    nombre: `${tema.nombre} (copia)`,
    solicitante: tema.solicitante || "",
    etiquetas: (tema.etiquetas || []).map((et) => ({ ...et })),
    prioridad: tema.prioridad || "Media",
    responsable: tema.responsable,
    estado: tema.estado,
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
//  dataApi.updateTemaEstado en el handler de drop del Kanban.)

// =========================================================
// Menu del tablero (boton "⋯" del tabbar): Etiquetas / Actividad
// =========================================================
let boardMenuView = "root"; // "root" | "etiquetas" | "editEtiqueta" | "actividad"
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
  boardMenuEtiquetaFiltro = "";
  actividadWindowCount = 1;
}

function boardMenuGoBack() {
  boardMenuView = boardMenuView === "editEtiqueta" ? "etiquetas" : "root";
  renderBoardMenu();
}

function renderBoardMenu() {
  els.boardMenuBack.classList.toggle("hidden", boardMenuView === "root");
  if (boardMenuView === "etiquetas") renderBoardMenuEtiquetas();
  else if (boardMenuView === "editEtiqueta") renderBoardMenuEditEtiqueta();
  else if (boardMenuView === "actividad") renderBoardMenuActividad();
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
    t.hitos.map((h) => ({ ...h, temaId: t.id, temaNombre: t.nombre, expediente: h.expediente || t.expediente }))
  );
  const rows = sortTableData(allHitos, "tableHitos");
  els.tableHitos.innerHTML = rows.length ? rows.map((h) => `
    <tr class="clickable-row" data-tema="${h.temaId}" title="Clic para abrir el tema">
      <td>${h.id}</td>
      <td>${escHtml(h.nombre)}</td>
      <td>${escHtml(h.temaNombre)}</td>
      <td>${respDisplay(h.responsable)}</td>
      <td>${badge(h.estado)}</td>
      <td>${h.expediente || "-"}</td>
      <td>${fmtDateNice(h.fechaInicio)}</td>
      <td><span class="fecha-with-badge"><span>${fmtDateNice(h.fechaLimite)}</span>${diasRestantesBadge(h.fechaLimite, h.estado === "Cerrado" ? h.fechaCierre : null)}</span></td>
    </tr>`).join("") : `<tr><td colspan="8" style="color:var(--muted);text-align:center">Sin hitos.</td></tr>`;

  els.tableHitos.querySelectorAll("[data-tema]").forEach((row) =>
    row.addEventListener("click", () => openTemaFormById(row.dataset.tema, { activeTab: "hitos" }))
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
    for (let i = 0; i < startWeekday; i++) html += dayCell(new Date(year, month, 1 - (startWeekday - i)), true, events, today);
    for (let d = 1; d <= daysInMonth; d++) html += dayCell(new Date(year, month, d), false, events, today);
    const fill = (7 - ((startWeekday + daysInMonth) % 7)) % 7;
    for (let i = 1; i <= fill; i++) html += dayCell(new Date(year, month + 1, i), true, events, today);
    const weeks = (startWeekday + daysInMonth + fill) / 7;
    els.calGrid.style.gridTemplateColumns = "repeat(7, 1fr)";
    els.calGrid.style.gridTemplateRows = `auto repeat(${weeks}, 1fr)`;
    els.calGrid.innerHTML = html;
  } else {
    const days = calendarDaysWindow();
    els.calTitle.textContent = calendarTitle(days);
    const weekdayNames = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
    let html = days.map((d) => `<div class="cal-weekday">${weekdayNames[(d.getDay() + 6) % 7]}</div>`).join("");
    html += days.map((d) => dayCell(d, false, events, today)).join("");
    els.calGrid.style.gridTemplateColumns = `repeat(${days.length}, 1fr)`;
    els.calGrid.style.gridTemplateRows = "auto 1fr";
    els.calGrid.innerHTML = html;
  }

  bindCalGrid();
}

function bindCalGrid() {
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
}

function dayCell(d, outside, events, todayStr) {
  const date = fmtDate(d);
  const dayEvents = events.filter((e) => e.fecha === date);
  return `
    <div class="cal-day ${outside ? "outside" : ""} ${date === todayStr ? "today" : ""}" data-date="${date}">
      <div class="day-num">${d.getDate()}</div>
      ${dayEvents.map((e) => `<div class="cal-event ev-${(e.estado || "pendiente").toLowerCase().replace(/\s+/g,"-")}" draggable="true" data-tema="${e.id}" title="${escHtml(e.nombre)}">${escHtml(e.nombre)}</div>`).join("")}
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
      <td>${a.expediente || "-"}</td>
      <td>${fmtDateNice(a.fechaLimite)}</td>
      <td><span class="row-edit-hint">✎ Editar</span></td>
    </tr>`).join("") || `<tr><td colspan="8" style="color:var(--muted);text-align:center">Sin alertas activas.</td></tr>`;

  els.tableAlertas.querySelectorAll("[data-tema]").forEach((row) =>
    row.addEventListener("click", () => openTemaFormById(row.dataset.tema))
  );
}

// =========================================================
// REPORTES
// =========================================================
function renderReportes() {
  const temas = getFilteredTemas();
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
    <article class="card" style="margin-top:8px"><h4 style="margin-bottom:8px">Documentos</h4><div id="expDocList">${ex.documentos.length ? ex.documentos.map(renderDocItem).join("") : "<p style='color:var(--muted)'>Sin documentos.</p>"}</div></article>
    <article class="card" style="margin-top:8px"><h4 style="margin-bottom:8px">Historial</h4>${ex.historial.length ? ex.historial.map((h) => `<p>${fmtDateNice(h.at)} · ${escHtml(h.event)}</p>`).join("") : "<p style='color:var(--muted)'>Sin historial.</p>"}</article>
    <article class="card" style="margin-top:8px"><h4 style="margin-bottom:8px">Responsables</h4>${responsables.map((r) => `<p>👤 ${escHtml(r)}</p>`).join("")}</article>
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
    return `<label>Responsable <span style="color:#dc2626">*</span><input name="responsable" value="${escHtml(currentValue || "")}" required /></label>`;
  }
  const opts = state.responsables.map((r) => {
    const full = [r.nombre, r.apellido].filter(Boolean).join(" ");
    const chk = selected.includes(full) ? "checked" : "";
    return `<label class="resp-cb-label"><input type="checkbox" name="resp_cb" value="${escHtml(full)}" ${chk}>${escHtml(full)}</label>`;
  }).join("");
  const displayLabel = selected.length ? escHtml(selected.join(", ")) : "-- Seleccionar --";
  const placeholderClass = selected.length ? "" : "placeholder";
  return `
    <label>Responsable <span style="color:#dc2626">*</span>
      <div class="resp-dropdown">
        <button type="button" class="resp-dropdown-trigger">
          <span class="resp-dropdown-label ${placeholderClass}">${displayLabel}</span>
          <span class="resp-dropdown-arrow">▾</span>
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

// scrollHeight es 0/incorrecto si el textarea esta dentro de un .task-pane
// oculto (display:none, p.ej. se abrio "Editar" estando en otra pestaña) —
// por eso el resize se re-dispara tambien al activar la pestaña Tarea.
function autoResizeTextarea(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
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
// con modoFecha === 'fecha' (un compromiso fijo) y ve si, sumando solo la
// duracionPropia de los hitos intermedios (mejor escenario posible, sin mas
// desfasajes), se llega a tiempo. Si hay varias ramas se reporta la peor.
// Valido mientras las cadenas sean lineales — el caso de uso actual, ya que
// un hito admite un unico predecesor.
function calcularCriticoHito(hito, hitos) {
  const sucesoresDirectos = hitos.filter((h) => h.predecesorId === hito.id);
  if (!sucesoresDirectos.length) return null;

  let peor = null;
  function explorar(sucesor, duracionAcumulada, profundidad) {
    if (profundidad > hitos.length + 1) return; // guarda defensiva
    const duracionConEste = duracionAcumulada + (Number(sucesor.duracionPropia) || 0);
    if (sucesor.modoFecha === "fecha") {
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
let ganttZoom = "quincena";

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

  // -------- conectores de dependencia (angulo recto + flecha) --------
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
    const markerId = h.__alertaFueraDeSecuencia ? "gantt-arrow-alerta" : "gantt-arrow";

    if (tipo === "FF") {
      // ambos extremos "fin": la conexion sale y entra por la derecha, con un
      // loop hacia afuera para no cruzar las barras.
      const startX = Math.max(predX0, predX1);
      const endX = Math.max(sucX0, sucX1);
      const loopX = Math.max(startX, endX) + 14;
      return `<path class="${linkCls}" marker-end="url(#${markerId})"
        d="M ${startX} ${predY} L ${loopX} ${predY} L ${loopX} ${sucY} L ${endX + 7} ${sucY}"></path>`;
    }
    // FC: sale del fin del predecesor. CC: sale del inicio del predecesor.
    const startX = tipo === "CC" ? Math.min(predX0, predX1) : Math.max(predX0, predX1);
    const endX = Math.min(sucX0, sucX1);
    const midX = Math.round((startX + endX) / 2);
    return `<path class="${linkCls}" marker-end="url(#${markerId})"
      d="M ${startX} ${predY} L ${midX} ${predY} L ${midX} ${sucY} L ${endX - 7} ${sucY}"></path>`;
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
              <marker id="gantt-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L8,4 L0,8 Z" class="gantt-arrow-head"></path>
              </marker>
              <marker id="gantt-arrow-alerta" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L8,4 L0,8 Z" class="gantt-arrow-head alerta"></path>
              </marker>
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

function hitoPredecesorChipHtml(hito, hitos) {
  if (!hito.predecesorId) return `<span class="hito-dep-chip muted">Sin dependencia</span>`;
  const pred = hitoPorId(hitos, hito.predecesorId);
  const nombre = pred ? pred.nombre : "(hito eliminado)";
  return `<span class="hito-dep-chip" title="Depende de: ${escHtml(nombre)}">Depende de: ${escHtml(nombre)}</span>`;
}

function tipoVinculoBadgeHtml(hito) {
  if (!hito.predecesorId || !hito.tipoVinculo) return "";
  const info = TIPO_VINCULO_INFO[hito.tipoVinculo];
  return `<span class="hito-tipo-badge" title="${escHtml(info ? `${info.label} — ${info.ayuda}` : hito.tipoVinculo)}">${hito.tipoVinculo}</span>`;
}

function hitoAlertBadgesHtml(hito) {
  const out = [];
  if (hito.__alertaFueraDeSecuencia) {
    out.push(`<span class="hito-alert-badge alert-dura" title="El hito queda antes de que su propio disparador ocurra — contradice el vinculo elegido">⛔ Fuera de secuencia</span>`);
  }
  if (hito.__alertaDesfasajeAlto) {
    const signo = hito.__desfasajeDias > 0 ? "+" : "";
    out.push(`<span class="hito-alert-badge alert-desfasaje" title="Desfasaje de ${signo}${hito.__desfasajeDias}d contra el ancla del predecesor">⚠ Desfasaje ${signo}${hito.__desfasajeDias}d</span>`);
  }
  if (hito.__critico) {
    const c = hito.__critico;
    out.push(`<span class="hito-alert-badge alert-critico" title="Aun en el mejor escenario no se llega a '${escHtml(c.hitoObjetivoNombre)}' (${fmtDateNice(c.fechaComprometida)}): se excede por ${c.excesoDias}d">🔥 Crítico</span>`);
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
          ${readonly ? "" : `<span class="hito-drag-handle" title="Arrastrar para reordenar" aria-hidden="true">⠿</span>`}
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
            ${readonly ? "" : `
            <div class="hito-actions">
              ${puedeEditar() ? `<button type="button" data-task-edit-hito="${h.id}" title="Editar" aria-expanded="false">✎</button>` : ""}
              ${puedeEliminar() ? `<button type="button" class="danger" data-task-delete-hito="${h.id}" title="Eliminar">🗑</button>` : ""}
            </div>`}
          </div>
        </div>
        <div class="hito-compact-meta">
          ${hitoPredecesorChipHtml(h, tema.hitos)}
          ${tipoVinculoBadgeHtml(h)}
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
      ${hito.__critico ? `<div class="hito-panel-critico-banner">🔥 <strong>Crítico:</strong> aun en el mejor escenario no se llega a "${escHtml(hito.__critico.hitoObjetivoNombre)}" (${fmtDateNice(hito.__critico.fechaComprometida)}) — se excede por ${hito.__critico.excesoDias}d.</div>` : ""}
      <div id="hitoPanelError-${hito.id}" class="hito-panel-error hidden"></div>

      <div class="hito-panel-grid-2col">
        <label>Nombre<input name="nombre" value="${escHtml(hito.nombre)}" required /></label>
        <label>Estado<select name="estado">${STATES.map((s) => `<option ${hito.estado === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
      </div>

      <div class="task-section-title">Dependencia</div>
      <div class="hito-panel-grid-2col">
        <label>Predecesor<select name="predecesorId" id="hitoPanelPredecesor-${hito.id}">${predOpts}</select></label>
        <label>Tipo de vínculo<select name="tipoVinculo" id="hitoPanelTipo-${hito.id}" ${tienePredecesor ? "" : "disabled"}>${tipoOpts}</select></label>
      </div>
      <p class="hito-panel-help" id="hitoPanelTipoAyuda-${hito.id}">${tienePredecesor ? TIPO_VINCULO_INFO[tipoActual].ayuda : "Elegí un predecesor para habilitar el tipo de vínculo."}</p>

      <div class="hito-panel-modo-toggle" role="group" aria-label="Modo de fecha">
        <button type="button" class="hito-modo-btn ${modoFecha === "fecha" ? "active" : ""}" data-hito-modo="fecha">Fecha específica</button>
        <button type="button" class="hito-modo-btn ${modoFecha === "dias" ? "active" : ""}" data-hito-modo="dias" ${tienePredecesor ? "" : "disabled"}>Desfasaje (días)</button>
      </div>
      <input type="hidden" name="modoFecha" id="hitoPanelModoFecha-${hito.id}" value="${modoFecha}" />

      <div class="hito-panel-grid-2col">
        <label id="hitoPanelCampoFecha-${hito.id}" class="${modoFecha === "fecha" ? "" : "hidden"}">Fecha<input type="date" name="fechaManual" value="${hito.fechaManual || hito.fechaLimite || ""}" /></label>
        <label id="hitoPanelCampoDesfasaje-${hito.id}" class="${modoFecha === "dias" ? "" : "hidden"}">Desfasaje (días, admite negativos)<input type="number" name="desfasajeDias" value="${hito.desfasajeDias ?? 0}" step="1" /></label>
        <label>Duración propia (días)<input type="number" name="duracionPropia" value="${hito.duracionPropia ?? 4}" min="1" step="1" /></label>
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
        <label>Descripción<textarea name="descripcion">${escHtml(hito.descripcion || "")}</textarea></label>
      </details>

      <div class="hito-panel-actions">
        ${puedeEliminar() ? `<button type="button" class="btn-delete" id="hitoPanelDeleteBtn-${hito.id}">Eliminar</button>` : ""}
        <span class="push-right"></span>
        <button type="button" class="ghost" id="hitoPanelCancelBtn-${hito.id}">Cancelar</button>
        <button type="button" class="primary" id="hitoPanelSaveBtn-${hito.id}">Guardar</button>
      </div>
    </div>`;
}

function closeAllHitoEditPanels(exceptHitoId) {
  document.querySelectorAll(".hito-edit-panel-wrap").forEach((wrap) => {
    if (wrap.id !== `hitoPanelWrap-${exceptHitoId}`) { wrap.innerHTML = ""; wrap.classList.add("hidden"); }
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
    btn?.setAttribute("aria-expanded", "false");
    return;
  }
  const hito = tema.hitos.find((h) => h.id === hitoId);
  if (!hito) return;
  wrap.innerHTML = buildHitoEditPanelHtml(tema, hito);
  wrap.classList.remove("hidden");
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
    limpiarError();
  }
  predecesorSelect.addEventListener("change", actualizarDisponibilidadPredecesor);
  tipoSelect.addEventListener("change", () => { tipoAyuda.textContent = TIPO_VINCULO_INFO[tipoSelect.value]?.ayuda || ""; });

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

  if (puedeEliminar()) {
    document.getElementById(`hitoPanelDeleteBtn-${hito.id}`)?.addEventListener("click", () => {
      deleteHito(tema, hito.id, { onSaved: refreshCallback });
    });
  }

  document.getElementById(`hitoPanelSaveBtn-${hito.id}`).addEventListener("click", async () => {
    const nombre = panelWrap.querySelector('[name="nombre"]').value.trim();
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

    const estado = panelWrap.querySelector('[name="estado"]').value;
    const modoFecha = predecesorId ? modoHidden.value : "fecha";
    const fechaManual = panelWrap.querySelector('[name="fechaManual"]')?.value || "";
    if (modoFecha === "fecha" && !fechaManual) { showToast("Completá la fecha"); return; }
    const desfasajeDiasRaw = panelWrap.querySelector('[name="desfasajeDias"]')?.value;
    const duracionPropiaRaw = panelWrap.querySelector('[name="duracionPropia"]')?.value;
    const descripcion = panelWrap.querySelector('[name="descripcion"]')?.value || "";
    const hiddenExp = document.getElementById(`${idPrefix}gdeNumeroHidden`);
    const expediente = ownExpChk.checked ? (hiddenExp?.value.trim() || "") : "";

    const fechasAntes = new Map(tema.hitos.map((h) => [h.id, `${h.fechaInicio}|${h.fechaLimite}`]));

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

function buildTareaTabHtml(draft, mode) {
  const editable = mode === "edit";

  const nombreField = editable
    ? `<textarea name="nombre" id="taskNombreInput" class="task-nombre-input" rows="1" required>${escHtml(draft.nombre || "")}</textarea>`
    : `<span class="task-nombre-view">${escHtml(draft.nombre || "-")}</span>`;

  const etiquetasChips = (draft.etiquetas || []).map((et, i) => etiquetaChipHtml(et, editable ? { removable: true, index: i } : {})).join("");
  const etiquetasBlock = `
    <div class="etiquetas-field">
      <span class="etiquetas-field-label">Etiquetas</span>
      <div class="etiquetas-row" id="taskEtiquetasRow">
        <div class="etiquetas-chips" id="taskEtiquetasChips">${etiquetasChips || (editable ? "" : `<span style="color:var(--muted);font-size:12.5px">-</span>`)}</div>
        ${editable ? `<button type="button" class="etiqueta-add-btn" id="taskEtiquetaAddBtn" title="Agregar etiqueta">+</button>
        <div class="etiqueta-popover hidden" id="taskEtiquetaPopover"></div>` : ""}
      </div>
    </div>`;

  const hasExp = Boolean(draft.expediente);
  const gdeBlock = editable ? `
    <div class="gde-compact-row">
      <input type="checkbox" id="taskHasExpChk" ${hasExp ? "checked" : ""} />
      <span class="gde-compact-number ${hasExp ? "" : "muted"}" id="taskGdeCompactNumber">${hasExp ? escHtml(draft.expediente) : "Sin expediente asociado"}</span>
      ${hasExp ? `<a href="#" class="gde-link" data-gde-open="${escHtml(draft.expediente)}" title="Abrir en GDE">🔗</a>` : ""}
      <button type="button" class="gde-compact-expand" id="taskGdeExpandBtn" title="${hasExp ? "Editar expediente" : "Agregar expediente"}">✎</button>
    </div>
    <div data-gde-container class="hidden">${buildGdeToggleWidget(draft.expediente || "")}</div>`
    : `
    <div class="gde-compact-row">
      <span class="gde-compact-number ${hasExp ? "" : "muted"}">${hasExp ? escHtml(draft.expediente) : "Sin expediente asociado"}</span>
      ${hasExp ? `<a href="#" class="gde-link" data-gde-open="${escHtml(draft.expediente)}" title="Abrir en GDE">🔗</a>` : ""}
    </div>`;

  const respField = editable
    ? buildRespSelector(draft.responsable || state.config.currentUser)
    : `<label>Responsable<div class="task-view-value">${respDisplay(draft.responsable)}</div></label>`;

  const prioridadField = editable
    ? `<label>Prioridad<select name="prioridad">${["Alta","Media","Baja"].map((x) => `<option ${(draft.prioridad || "Media") === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>`
    : `<label>Prioridad<div class="task-view-value"><span class="prio prio-${(draft.prioridad || "media").toLowerCase()}">${draft.prioridad || "Media"}</span></div></label>`;

  const solicitanteField = editable
    ? `<label>Solicitante<input name="solicitante" value="${escHtml(draft.solicitante || "")}" /></label>`
    : `<label>Solicitante<div class="task-view-value">${escHtml(draft.solicitante || "-")}</div></label>`;

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

  const privadoField = editable
    ? `<label class="task-check-row"><input type="checkbox" name="privado" ${draft.privado ? "checked" : ""} />Tema privado (solo lo puede ver quien lo creo)</label>`
    : `<div class="task-check-row">${draft.privado ? "🔒 Tema privado (solo lo puede ver quien lo creo)" : "Tema visible para todos"}</div>`;

  return `
    <div class="task-section">
      <label>Nombre${nombreField}</label>
      ${etiquetasBlock}
    </div>

    <div class="task-section">${gdeBlock}</div>

    <div class="task-grid-3col">
      ${respField}
      ${prioridadField}
      ${solicitanteField}
    </div>
    <div class="task-grid-3col">
      ${inicioField}
      ${vencimientoField}
      ${diasField}
    </div>

    <details class="task-section">
      <summary class="task-section-title">Descripción y privacidad</summary>
      ${descripcionField}
      ${privadoField}
    </details>
  `;
}

function wireTareaTabEvents(draft, mode) {
  els.taskForm.querySelectorAll("[data-gde-open]").forEach((a) => {
    a.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); openGDE(a.dataset.gdeOpen); });
  });

  if (mode !== "edit") return;

  initRespDropdowns(els.taskForm);
  const gdeContainer = els.taskForm.querySelector("[data-gde-container]");
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

  const nombreInput = document.getElementById("taskNombreInput");
  const titleEl = document.getElementById("taskModalTitle");
  if (nombreInput) {
    autoResizeTextarea(nombreInput);
    nombreInput.addEventListener("input", () => {
      if (titleEl) titleEl.textContent = nombreInput.value.trim() || "Nuevo tema";
      autoResizeTextarea(nombreInput);
    });
  }

  const estadoSelect = els.taskForm.querySelector('[name="estado"]');
  const getFechaCierre = () => {
    const currentEstado = estadoSelect ? estadoSelect.value : draft.estado;
    return currentEstado === "Cerrado" ? (draft.fechaCierre || fmtDate(new Date())) : null;
  };
  const updateDiasBadge = wireDiasBadge(document.getElementById("taskFechaLimiteInput"), document.getElementById("taskDiasBadge"), getFechaCierre);
  estadoSelect?.addEventListener("change", () => updateDiasBadge && updateDiasBadge());
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
function buildHitosTabHtml(draft, mode) {
  const editable = mode === "edit";
  calcularCascadaHitos(draft.hitos);
  return `
    <div class="task-section">
      <div class="task-section-title">Gantt</div>
      <div id="taskGanttWrap">${renderMiniGantt(draft)}</div>
    </div>

    <div class="task-section">
      <div class="task-section-title">Hitos</div>
      <div class="hito-compact-list" id="taskHitosList">${renderHitosCompactList(draft, { readonly: !editable })}</div>
      ${editable && puedeEditar() ? `<button type="button" class="col-add" id="taskAddHitoBtn" style="margin-top:10px">+ Agregar hito</button>` : ""}
      <div id="taskHitoInlineFormWrap"></div>
    </div>
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
      toggleHitoEditPanel(draft, btn.dataset.taskEditHito, () => refreshTaskHitosPane(draft, mode));
    });
  });
  list.querySelectorAll("[data-task-delete-hito]").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteHito(draft, btn.dataset.taskDeleteHito, { onSaved: () => refreshTaskHitosPane(draft, mode) });
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
    refreshTaskHitosPane(draft, mode);
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
        <p class="gde-own-inherited">Sin dependencia ni responsable propio por ahora — se configuran despues desde ✎ Editar.</p>
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
      refreshTaskHitosPane(draft, "edit");
    });
  });
}

function refreshTaskHitosPane(draft, mode) {
  const pane = els.taskForm.querySelector('.task-pane[data-task-pane="hitos"]');
  if (!pane) return;
  pane.innerHTML = buildHitosTabHtml(draft, mode);
  wireHitosListButtons(draft, mode);
  wireHitoDragReorder(draft, mode);
  wireGanttZoom(draft);
  if (mode === "edit") wireAddHitoInline(draft);
  const totalH = draft.hitos.length;
  const doneH = draft.hitos.filter((h) => h.estado === "Cerrado").length;
  const tabBtn = els.taskForm.querySelector('.task-tab[data-task-tab="hitos"]');
  if (tabBtn) tabBtn.textContent = `Hitos${totalH > 0 ? ` (${doneH}/${totalH})` : ""}`;
  // Every hito mutation also pushes a historial entry — keep Actividad in sync.
  refreshTaskActividadPane(draft);
}

// =========================================================
// Task modal — Tab "Actividad"
// =========================================================
function buildActividadTabHtml(tema) {
  const historialHtml = (tema.historial || []).map((h) => `
    <div class="activity-entry">
      <div class="activity-dot"></div>
      <div>
        <div style="font-size:12.5px"><strong>${fmtDateNice(h.at)}</strong> — ${escHtml(h.event)}</div>
        <div style="font-size:11px;color:var(--muted)">${escHtml(h.by || "sistema")}</div>
      </div>
    </div>`).join("") || `<p style="color:var(--muted)">Sin historial.</p>`;

  const comentariosHtml = (tema.comentarios || []).map((c) => `
    <div class="activity-entry">
      <div class="activity-dot"></div>
      <div>
        <div style="font-size:12.5px"><strong>${escHtml(c.by)}</strong>: ${escHtml(c.text)}</div>
        <div style="font-size:11px;color:var(--muted)">${fmtDateNice(c.at)}</div>
      </div>
    </div>`).join("");

  return `
    <div class="activity-log" id="taskActivityLog">${historialHtml}${comentariosHtml}</div>
    ${puedeEditar() ? `<div class="add-comment"><input id="taskNewComment" placeholder="Agregar comentario..." class="detail-input" /><button type="button" class="primary" id="taskSaveComment">Enviar</button></div>` : ""}
  `;
}

function wireActividadTabEvents(draft) {
  const btn = document.getElementById("taskSaveComment");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const input = document.getElementById("taskNewComment");
    const v = (input?.value || "").trim();
    if (!v) return;
    if (!isPersistedTema(draft)) { showToast("Guarda el tema antes de comentar."); return; }
    const currentUser = activeUserName();
    const ok = await withBusy(async () => {
      await dataApi.createComentario(draft.id, v);
      await dataApi.logActivity(draft.id, `Comentario: "${v.slice(0, 40)}"`);
    });
    if (!ok) return;
    draft.comentarios = draft.comentarios || [];
    draft.comentarios.push({ by: currentUser, text: v, at: fmtDate(new Date()) });
    draft.ultimaActualizacion = fmtDate(new Date());
    draft.historial.push({ event: `Comentario: "${v.slice(0, 40)}"`, at: fmtDate(new Date()), by: currentUser });
    renderAll();
    refreshTaskActividadPane(draft);
  });
}

function refreshTaskActividadPane(draft) {
  const pane = els.taskForm.querySelector('.task-pane[data-task-pane="actividad"]');
  if (!pane) return;
  pane.innerHTML = buildActividadTabHtml(draft);
  wireActividadTabEvents(draft);
}

// =========================================================
// Task modal — Tab "Documentos"
// =========================================================
// Documentos son objetos {id, nombre, storagePath, ...}. Enlace de descarga
// via signed URL generada al hacer clic.
function renderDocItem(d) {
  const nombre = d && d.nombre ? d.nombre : String(d || "");
  const id = d && d.id ? d.id : "";
  return `<div class="doc-item">
    <span>📄 ${escHtml(nombre)}</span>
    ${id ? `<a href="#" class="link" data-doc-download="${id}" style="margin-left:8px">Ver / descargar</a>` : ""}
  </div>`;
}

function wireDocDownloads(container) {
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
}

function buildDocumentosTabHtml(tema) {
  const docHtml = tema.documentos.length
    ? tema.documentos.map(renderDocItem).join("")
    : `<p style="color:var(--muted)">Sin documentos adjuntos.</p>`;
  return `
    <div id="taskDocList">${docHtml}</div>
    ${puedeEditar() ? `<button type="button" class="col-add" id="taskUploadDocBtn" style="margin-top:10px">⤴ Adjuntar documento</button>` : ""}
  `;
}

function wireDocumentosTabEvents(draft) {
  wireDocDownloads(document.getElementById("taskDocList"));
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
        refreshTaskDocumentosPane(draft);
      });
    };
    input.click();
  });
}

function refreshTaskDocumentosPane(draft) {
  const pane = els.taskForm.querySelector('.task-pane[data-task-pane="documentos"]');
  if (!pane) return;
  pane.innerHTML = buildDocumentosTabHtml(draft);
  wireDocumentosTabEvents(draft);
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
      if (tab.dataset.taskTab === "tarea") autoResizeTextarea(document.getElementById("taskNombreInput"));
    });
  });
}

// El modal unifica vista (readonly) y edicion. `initialMode` decide con que modo
// abre; "Editar"/"Cancelar" alternan entre ambos sin cerrar la ventana ni perder
// los tabs Hitos/Actividad/Documentos ya cargados (esos se persisten al toque,
// no dependen de Guardar/Cancelar del tab Tarea).
function renderTaskFormShell(draft, isEdit, initialMode) {
  let mode = initialMode || (isEdit ? "view" : "edit");
  let tareaSnapshot = mode === "edit" ? snapshotTareaFields(draft) : null;

  function currentTab() {
    return els.taskForm.querySelector(".task-tab.active")?.dataset.taskTab || "tarea";
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

  function wireFooterEvents() {
    if (mode === "view") {
      document.getElementById("taskEditBtn")?.addEventListener("click", () => {
        const tab = currentTab();
        mode = "edit";
        tareaSnapshot = snapshotTareaFields(draft);
        render(tab);
      });
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
    const activeTab = tab || "tarea";
    const totalH = draft.hitos.length;
    const doneH = draft.hitos.filter((h) => h.estado === "Cerrado").length;
    const editable = mode === "edit";

    els.taskForm.innerHTML = `
      <div class="task-modal-header">
        <div class="task-modal-title-block">
          <span class="id-pill">${escHtml(draft.id)}</span>
          <h3 class="task-modal-title" id="taskModalTitle">${escHtml(draft.nombre) || "Nuevo tema"}</h3>
          ${draft.privado ? `<span class="id-pill" title="Solo visible para quien lo creo">🔒</span>` : ""}
        </div>
        <div class="task-modal-header-actions">
          ${editable
            ? `<select name="estado" class="task-modal-estado-select">${STATES.map((s) => `<option ${draft.estado === s ? "selected" : ""}>${s}</option>`).join("")}</select>`
            : badge(draft.estado)}
          <button type="button" class="task-modal-close" id="taskModalCloseBtn" aria-label="Cerrar">✕</button>
        </div>
      </div>

      <div class="task-modal-tabs">
        <button type="button" class="task-tab ${activeTab === "tarea" ? "active" : ""}" data-task-tab="tarea">Tarea</button>
        <button type="button" class="task-tab ${activeTab === "hitos" ? "active" : ""}" data-task-tab="hitos">Hitos${totalH > 0 ? ` (${doneH}/${totalH})` : ""}</button>
        <button type="button" class="task-tab ${activeTab === "actividad" ? "active" : ""}" data-task-tab="actividad">Actividad</button>
        <button type="button" class="task-tab ${activeTab === "documentos" ? "active" : ""}" data-task-tab="documentos">Documentos${draft.documentos.length ? ` (${draft.documentos.length})` : ""}</button>
      </div>

      <div class="task-modal-content">
        <div class="task-pane ${activeTab === "tarea" ? "active" : ""}" data-task-pane="tarea">${buildTareaTabHtml(draft, mode)}</div>
        <div class="task-pane ${activeTab === "hitos" ? "active" : ""}" data-task-pane="hitos">${buildHitosTabHtml(draft, mode)}</div>
        <div class="task-pane ${activeTab === "actividad" ? "active" : ""}" data-task-pane="actividad">${buildActividadTabHtml(draft)}</div>
        <div class="task-pane ${activeTab === "documentos" ? "active" : ""}" data-task-pane="documentos">${buildDocumentosTabHtml(draft)}</div>
      </div>

      <div class="task-modal-footer ${editable ? "" : "footer-view"}">${footerHtml()}</div>
    `;

    wireTaskModalTabs();
    wireTareaTabEvents(draft, mode);
    wireHitosListButtons(draft, mode);
    wireHitoDragReorder(draft, mode);
    wireGanttZoom(draft);
    if (editable) wireAddHitoInline(draft);
    wireActividadTabEvents(draft);
    wireDocumentosTabEvents(draft);

    document.getElementById("taskModalCloseBtn").addEventListener("click", () => els.modalTask.close());
    wireFooterEvents();
  }

  els.taskForm.onsubmit = async (e) => {
    e.preventDefault();
    if (mode !== "edit" || !puedeEditar()) return;
    const resp = getSelectedResp(els.taskForm);
    if (!resp) { showToast("Selecciona al menos un responsable"); return; }
    const nombreVal = (els.taskForm.querySelector('[name="nombre"]')?.value || "").trim();
    if (!nombreVal) { showToast("El nombre del tema es requerido"); return; }
    const data = Object.fromEntries(new FormData(els.taskForm).entries());
    data.responsable = resp;
    data.privado = els.taskForm.querySelector('[name="privado"]')?.checked || false;
    const hasExp = document.getElementById("taskHasExpChk")?.checked;
    const gdeHidden = document.getElementById("tarea-gdeNumeroHidden");
    data.expediente = hasExp ? (gdeHidden ? gdeHidden.value.trim() : (draft.expediente || "")) : "";
    delete data.numero;

    Object.assign(draft, data);
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
    const ok = await withBusy(async () => {
      if (isEdit) {
        await dataApi.updateTema(draft.id, draft);
        await dataApi.logActivity(draft.id, "Tema editado");
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

  render("tarea");
}

function openTemaForm(existing = null, defaultEstado = "Pendiente", opts = {}) {
  const isEdit = Boolean(existing);
  const draft = existing || {
    id: nextTemaId(),
    nombre: "", solicitante: "", etiquetas: [],
    prioridad: "Media", responsable: state.config.currentUser,
    estado: defaultEstado, expediente: "", gde: "",
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
    ${existing?.predecesorId ? `<p class="gde-own-inherited">Este hito depende de otro — para tocar la dependencia usá ✎ en el tab Hitos del tema.</p>` : ""}
    <label>Descripcion<textarea name="descripcion">${escHtml(existing?.descripcion || "")}</textarea></label>
    <label style="display:flex;flex-direction:row;align-items:center;gap:8px;font-size:13px;color:var(--text)">
      <input type="checkbox" id="hitoOwnExpChk" ${hasOwnExp ? "checked" : ""} style="width:auto" />
      Este hito tiene expediente propio
    </label>
    <p id="hitoExpInherited" class="gde-own-inherited ${hasOwnExp ? "hidden" : ""}">${tema.expediente ? `Sin expediente propio · hereda ${escHtml(tema.expediente)} del tema` : "Sin expediente propio · el tema tampoco tiene expediente asociado"}</p>
    <div id="hitoExpWrap" class="${hasOwnExp ? "" : "hidden"}">${buildGdeToggleWidget(existing?.expediente || "")}</div>
    <div class="btn-group">
      ${isEdit && puedeEliminar() ? `<button type="button" class="ghost" id="hitoDeleteBtn" style="color:#dc2626;margin-right:auto">🗑 Eliminar</button>` : ""}
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
    if (opts.onSaved) opts.onSaved(); else openTemaFormById(tema.id, { activeTab: "hitos" });
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
  if (opts.onSaved) opts.onSaved(); else openTemaFormById(tema.id, { activeTab: "hitos" });
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
        <button type="button" id="${idPrefix}btnGdeWidgetOpen" class="action gde-form-btn">🔗 Buscar en GDE</button>
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
        <button type="button" class="action gde-form-btn" id="${idPrefix}btnGdeVerificar">🔗 Verificar</button>
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
      <button class="ghost" type="button" onclick="document.getElementById('modalForm').close()">Cancelar</button>
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
        <td><button class="ghost" data-resp-edit="${r.id}" style="font-size:12.5px">✎ Editar</button></td>
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
        <div class="resp-card-head">
          <div class="resp-avatar-lg" style="background:${color}">${initials}</div>
          <div class="resp-info">
            <div class="resp-name">${escHtml(fullName)}</div>
            ${r.email ? `<div class="resp-email">✉ ${escHtml(r.email)}</div>` : `<div class="resp-email" style="color:#c0c9d8">Sin correo</div>`}
            ${r.cargo ? `<div class="resp-dep">💼 ${escHtml(r.cargo)}</div>` : ""}
            ${r.dependencia ? `<div class="resp-dep">📁 ${escHtml(r.dependencia)}</div>` : ""}
            ${r.usuarioGDE ? `<div class="resp-dep">🔑 GDE: ${escHtml(r.usuarioGDE)}</div>` : ""}
          </div>
        </div>
        <hr class="resp-divider" />
        <div class="resp-stats">
          <div class="resp-stat"><strong>${stats.temas}</strong><small>Temas propios</small></div>
          <div class="resp-stat"><strong>${stats.hitos}</strong><small>Hitos asignados</small></div>
          <div class="resp-stat"><strong>${stats.temasConHito}</strong><small>Temas con hitos</small></div>
        </div>
        <div class="resp-card-footer">
          <button class="ghost" data-resp-edit="${r.id}" style="font-size:12.5px">✎ Editar</button>
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
      <button class="ghost" value="cancel" type="button" onclick="document.getElementById('modalForm').close()">Cancelar</button>
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
  // contrasenas). El admin no crea usuarios: los aprueba y asigna rol.
  els.dynamicForm.innerHTML = `
    <h3>Alta de usuarios</h3>
    <p style="font-size:13.5px;line-height:1.6;color:var(--text)">
      Los usuarios se dan de alta ellos mismos desde la pantalla de inicio con
      <strong>"Solicitar acceso"</strong>. Cuando lo hagan, apareceran en
      <strong>Solicitudes pendientes</strong> y desde ahi podras aprobarlos y
      asignarles un rol (Admin / Editor / Viewer).
    </p>
    <div class="btn-group" style="justify-content:flex-end">
      <button class="primary" type="button" onclick="document.getElementById('modalForm').close()">Entendido</button>
    </div>
  `;
  els.dynamicForm.onsubmit = (e) => { e.preventDefault(); els.modalForm.close(); };
  els.modalForm.showModal();
}

// =========================================================
// Exports
// =========================================================
function exportCsv() {
  const temas = getFilteredTemas();
  const header = ["id","nombre","expediente","responsable","prioridad","fechaInicio","fechaLimite","estado"];
  const rows = temas.map((t) => header.map((h) => csv(String(t[h] || ""))).join(","));
  download("reporte_temas.csv", [header.join(","), ...rows].join("\n"), "text/csv;charset=utf-8;");
}

function exportExcel() {
  const temas = getFilteredTemas();
  const tsv = ["ID\tTema\tEstado\tResponsable\tVto", ...temas.map((t) => `${t.id}\t${t.nombre}\t${t.estado}\t${t.responsable}\t${t.fechaLimite}`)].join("\n");
  download("reporte_temas.xls", tsv, "application/vnd.ms-excel");
}

function exportPdfLike() {
  const temas = getFilteredTemas();
  const printArea = document.getElementById("printArea");
  if (!printArea) return;

  printArea.innerHTML = `
    <div style="font-family:Arial,sans-serif;padding:20px">
      <h1 style="font-size:18px;margin-bottom:4px">Reporte de Temas — SSOyS</h1>
      <p style="color:#666;font-size:12px;margin-bottom:16px">Fecha: ${fmtDate(new Date())} · Usuario: ${escHtml(state.config.currentUser)}</p>
      <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#f1f5f9">
            <th>ID</th><th>Tema</th><th>Responsable</th><th>Estado</th><th>Vencimiento</th>
          </tr>
        </thead>
        <tbody>
          ${temas.map((t) => `
          <tr>
            <td>${t.id}</td>
            <td>${escHtml(t.nombre)}</td>
            <td>${escHtml(t.responsable || "-")}</td>
            <td>${t.estado}</td>
            <td>${t.fechaLimite}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <p style="font-size:10px;color:#999;margin-top:12px">Gestion de Temas SSOyS · ${temas.length} temas</p>
    </div>`;

  window.print();
}

function download(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function csv(v) { return /[",\n]/.test(v) ? `"${v.replaceAll('"','""')}"` : v; }

// =========================================================
// Utils
// =========================================================
function nextTemaId() {
  const ids = state.temas.map((t) => parseInt(t.id.replace(/\D/g,""), 10) || 0);
  return `T-${String((Math.max(0,...ids)) + 1).padStart(3,"0")}`;
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

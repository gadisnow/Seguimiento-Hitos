const STORAGE_KEY = "sgtemas_v4";

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

const tableSortState = {
  tableAgendaLista: { key: "id", dir: 1 },
  tableExpedientes: { key: "numero", dir: 1 },
  tableAlertas:     { key: "level", dir: 1 }
};

const tableSortGetters = {
  tableAgendaLista: {
    id: (x) => x.id || "",
    nombre: (x) => x.nombre || "",
    programa: (x) => x.programa || "",
    expediente: (x) => x.expediente || "",
    responsable: (x) => x.responsable || "",
    estado: (x) => x.estado || "",
    prioridad: (x) => x.prioridad || "",
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
    level: (x) => x.level || "",
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

// =========================================================
// Seed data
// =========================================================
const seedData = {
  config: { currentUser: "Jorge Rios", areaDefault: "SSOyS", rol: "Admin" },
  temas: [
    {
      id: "T-001",
      nombre: "Declaracion Jurada Anual de Patrimonio (periodo 2025)",
      programa: "Personales",
      solicitante: "Valeria Ricco",
      prioridad: "Media",
      responsable: "Jorge Rios",
      estado: "Pendiente",
      expediente: "",
      gde: "",
      fechaInicio: "2026-05-04",
      fechaLimite: "2026-07-31",
      ultimaActualizacion: "2026-05-26",
      descripcion: "VTO 31 de julio de 2026. Jorge avisado el 26/5.",
      historial: [{ event: "Tema creado", at: "2026-05-04", by: "Jorge Rios" }],
      comentarios: [],
      documentos: [],
      hitos: [
        { id: "H-001-1", nombre: "Recibir pedido OA: NO-2026-44395169-APN-SSGAI#MEC", responsable: "Jorge Rios", estado: "Cerrado", fechaLimite: "2026-05-10" },
        { id: "H-001-2", nombre: "Completar declaracion con modelo periodo 2024", responsable: "Jorge Rios", estado: "Pendiente", fechaLimite: "2026-07-15" },
        { id: "H-001-3", nombre: "Presentar declaracion jurada", responsable: "Jorge Rios", estado: "Bloqueado", fechaLimite: "2026-07-31" }
      ]
    },
    {
      id: "T-002",
      nombre: "NRU 1763 - Barrio Avenida de las Americas - Municipalidad de Concepcion",
      programa: "DNISU",
      solicitante: "Natalia Hilu, Pablo Morillo",
      prioridad: "Alta",
      responsable: "Alejandro B",
      estado: "En curso",
      expediente: "EX-2022-94776460-APN-CEFISU#MDS",
      gde: "https://gde.example/EX-2022-94776460",
      fechaInicio: "2026-05-19",
      fechaLimite: "2026-06-15",
      ultimaActualizacion: "2026-05-26",
      descripcion: "Validacion del Certificado de avance N02 (60%) por auditor externo.",
      historial: [{ event: "Tema creado", at: "2026-05-19", by: "Alejandro B" }],
      comentarios: [],
      documentos: ["Certificado_avance_N02.pdf", "Dictamen_auditor.pdf", "Observaciones.pdf"],
      hitos: [
        { id: "H-002-1", nombre: "Enviar certificado al auditor externo", responsable: "Alejandro B", estado: "Cerrado", fechaLimite: "2026-05-08" },
        { id: "H-002-2", nombre: "Revision del auditor externo", responsable: "Luis Mesones", estado: "En curso", fechaLimite: "2026-06-10" },
        { id: "H-002-3", nombre: "Recepcion de observaciones", responsable: "Alejandro B", estado: "Pendiente", fechaLimite: "2026-06-12" },
        { id: "H-002-4", nombre: "Subsanar observaciones", responsable: "Alejandro B", estado: "Pendiente", fechaLimite: "2026-06-13" },
        { id: "H-002-5", nombre: "Aprobacion final", responsable: "Luis Mesones", estado: "Pendiente", fechaLimite: "2026-06-15" }
      ]
    },
    {
      id: "T-003",
      nombre: "NRU 1754 - Barrio Santa Barbara 1 y 2 - Cooperativa Santa Barbara Ltda",
      programa: "DNISU",
      solicitante: "Jose Paredes, Natalia Hilu",
      prioridad: "Media",
      responsable: "Alejandro B",
      estado: "Pendiente",
      expediente: "",
      gde: "",
      fechaInicio: "2026-05-19",
      fechaLimite: "2026-06-30",
      ultimaActualizacion: "2026-05-22",
      descripcion: "",
      historial: [{ event: "Tema creado", at: "2026-05-19", by: "Alejandro B" }],
      comentarios: [],
      documentos: [],
      hitos: [
        { id: "H-003-1", nombre: "Definicion de circuito para aprobacion de Redeterminacion de precios (C2)", responsable: "Alejandro B", estado: "Pendiente", fechaLimite: "2026-06-10" },
        { id: "H-003-2", nombre: "Validacion del certificado por auditoria externa", responsable: "Luis Mesones", estado: "Pendiente", fechaLimite: "2026-06-20" },
        { id: "H-003-3", nombre: "Formalizacion del cierre del proyecto", responsable: "Alejandro B", estado: "Pendiente", fechaLimite: "2026-06-30" }
      ]
    },
    {
      id: "T-004",
      nombre: "Estado proyectos 5797, 5798, 5799 - Fundacion Trazando Futuro / Coop. Suenos en Comun",
      programa: "DNISU",
      solicitante: "Sebastian Pareja",
      prioridad: "Media",
      responsable: "Alejandro B",
      estado: "Pendiente",
      expediente: "",
      gde: "",
      fechaInicio: "2026-05-19",
      fechaLimite: "2026-06-29",
      ultimaActualizacion: "2026-05-19",
      descripcion: "",
      historial: [{ event: "Tema creado", at: "2026-05-19", by: "Alejandro B" }],
      comentarios: [],
      documentos: [],
      hitos: [
        { id: "H-004-1", nombre: "Proy. 5797 - Barrio Quinta de Pelozo - SUM y Playon deportivo", responsable: "Alejandro B", estado: "Pendiente", fechaLimite: "2026-06-10" },
        { id: "H-004-2", nombre: "Proy. 5798 - Barrio San Carlos I - Electrica y Nucleos humedos", responsable: "Alejandro B", estado: "Pendiente", fechaLimite: "2026-06-20" },
        { id: "H-004-3", nombre: "Proy. 5799 - Barrio Nuevo Amanecer - Electrica, Vereda y arbolado", responsable: "Alejandro B", estado: "Pendiente", fechaLimite: "2026-06-29" }
      ]
    },
    {
      id: "T-005",
      nombre: "Loteo Parque Sur - Municipalidad de Catamarca",
      programa: "DNISU",
      solicitante: "Jose Paredes, Natalia Hilu, Valeria Sanchez",
      prioridad: "Alta",
      responsable: "Luis Mesones",
      estado: "En curso",
      expediente: "EX-2022-130503405-APN-CEFISU#MDS",
      gde: "https://gde.example/EX-2022-130503405",
      fechaInicio: "2026-05-19",
      fechaLimite: "2026-06-12",
      ultimaActualizacion: "2026-05-23",
      descripcion: "RDT 5 - rendiciones enviadas el 07-05-26.",
      historial: [{ event: "Tema creado", at: "2026-05-19", by: "Luis Mesones" }],
      comentarios: [],
      documentos: [],
      hitos: [
        { id: "H-005-1", nombre: "CO 6, 7 y 8 - Elevacion a Subsecretaria para desembolsos", responsable: "Alejandro B", estado: "En curso", fechaLimite: "2026-06-05" },
        { id: "H-005-2", nombre: "RDT 5 - Subsanacion de rendiciones por la UE", responsable: "Jurisdiccion", estado: "Bloqueado", fechaLimite: "2026-06-08" },
        { id: "H-005-3", nombre: "RDT 5 - Elevacion del informe", responsable: "Luis Mesones", estado: "Bloqueado", fechaLimite: "2026-06-12" }
      ]
    },
    {
      id: "T-006",
      nombre: "Convenio Traspaso a Cordoba - Barrio Zepa SISU",
      programa: "DNISU",
      solicitante: "BH, Adrian Danieli",
      prioridad: "Alta",
      responsable: "Gabriela",
      estado: "En curso",
      expediente: "",
      gde: "",
      fechaInicio: "2026-05-19",
      fechaLimite: "2026-06-05",
      ultimaActualizacion: "2026-05-25",
      descripcion: "",
      historial: [{ event: "Tema creado", at: "2026-05-19", by: "Gabriela" }],
      comentarios: [],
      documentos: [],
      hitos: [
        { id: "H-006-1", nombre: "Hito 1 - Definicion de alcance", responsable: "Gabriela", estado: "En curso", fechaLimite: "2026-06-05" }
      ]
    },
    {
      id: "T-007",
      nombre: "Seguimiento 3 expedientes de subastas - Liceo / Estacion Buenos Aires / La Plata",
      programa: "PROCREAR",
      solicitante: "BH",
      prioridad: "Alta",
      responsable: "Karina",
      estado: "En curso",
      expediente: "",
      gde: "",
      fechaInicio: "2026-05-19",
      fechaLimite: "2026-06-02",
      ultimaActualizacion: "2026-05-27",
      descripcion: "",
      historial: [{ event: "Tema creado", at: "2026-05-19", by: "Karina" }],
      comentarios: [],
      documentos: [],
      hitos: [
        { id: "H-007-1", nombre: "Barrio Liceo - Publicacion en boletin oficial", responsable: "Karina", estado: "En curso", fechaLimite: "2026-05-31" },
        { id: "H-007-2", nombre: "Estacion Buenos Aires - Publicacion en boletin oficial", responsable: "Karina", estado: "En curso", fechaLimite: "2026-06-01" },
        { id: "H-007-3", nombre: "La Plata - Publicacion en boletin oficial", responsable: "Marielda", estado: "En curso", fechaLimite: "2026-06-02" }
      ]
    },
    {
      id: "T-008",
      nombre: "Concesion Palais de Glace",
      programa: "Concesiones",
      solicitante: "Ignacio Lupi",
      prioridad: "Alta",
      responsable: "Luisina",
      estado: "Bloqueado",
      expediente: "",
      gde: "",
      fechaInicio: "2026-05-20",
      fechaLimite: "2026-06-30",
      ultimaActualizacion: "2026-05-28",
      descripcion: "",
      historial: [{ event: "Tema creado", at: "2026-05-20", by: "Luisina" }],
      comentarios: [],
      documentos: [],
      hitos: [
        { id: "H-008-1", nombre: "Delegacion de facultades - con expediente", responsable: "Luisina, Karina", estado: "En curso", fechaLimite: "2026-06-05" },
        { id: "H-008-2", nombre: "Confeccion de pliegos", responsable: "Luisina", estado: "En curso", fechaLimite: "2026-06-15" },
        { id: "H-008-3", nombre: "Llamado a licitacion", responsable: "Karina", estado: "Bloqueado", fechaLimite: "2026-06-30" }
      ]
    },
    {
      id: "T-009",
      nombre: "Concesion ETOR",
      programa: "Concesiones",
      solicitante: "Ignacio Lupi",
      prioridad: "Alta",
      responsable: "Luisina",
      estado: "Bloqueado",
      expediente: "",
      gde: "",
      fechaInicio: "2026-05-20",
      fechaLimite: "2026-06-08",
      ultimaActualizacion: "2026-05-20",
      descripcion: "",
      historial: [{ event: "Tema creado", at: "2026-05-20", by: "Luisina" }],
      comentarios: [],
      documentos: [],
      hitos: []
    },
    {
      id: "T-010",
      nombre: "Concesion Muse MARQ",
      programa: "Concesiones",
      solicitante: "Ignacio Lupi",
      prioridad: "Media",
      responsable: "Luisina",
      estado: "Cerrado",
      expediente: "",
      gde: "",
      fechaInicio: "2026-05-20",
      fechaLimite: "2026-06-20",
      ultimaActualizacion: "2026-05-20",
      descripcion: "",
      historial: [{ event: "Tema creado", at: "2026-05-20", by: "Luisina" }],
      comentarios: [],
      documentos: [],
      hitos: []
    },
    {
      id: "T-011",
      nombre: "13 Foro Urbano Mundial (WUF13) MINURVI",
      programa: "Institucionales",
      solicitante: "Wenceslao Maislin",
      prioridad: "Baja",
      responsable: "Jorge Rios",
      estado: "En revision",
      expediente: "",
      gde: "",
      fechaInicio: "2026-05-14",
      fechaLimite: "2026-12-15",
      ultimaActualizacion: "2026-05-28",
      descripcion: "Mayo 2026: definir ejes tematicos. Julio 2026: avances en plenaria virtual. Diciembre 2026: informe final.",
      historial: [{ event: "Tema creado", at: "2026-05-14", by: "Jorge Rios" }],
      comentarios: [],
      documentos: [],
      hitos: [
        { id: "H-011-1", nombre: "Definicion de ejes tematicos", responsable: "Jorge Rios", estado: "En revision", fechaLimite: "2026-05-31" },
        { id: "H-011-2", nombre: "Plenaria virtual de avances", responsable: "Jorge Rios", estado: "Pendiente", fechaLimite: "2026-07-31" }
      ]
    },
    {
      id: "T-012",
      nombre: "Expedientes designaciones KL y LR",
      programa: "Administracion",
      solicitante: "Privada",
      prioridad: "Media",
      responsable: "Privada",
      estado: "Cerrado",
      expediente: "EX-2026-33988163-APN-DGDA#MEC",
      gde: "https://gde.example/EX-2026-33988163",
      fechaInicio: "2026-05-15",
      fechaLimite: "2026-06-05",
      ultimaActualizacion: "2026-05-28",
      descripcion: "",
      historial: [{ event: "Tema creado", at: "2026-05-15", by: "Privada" }],
      comentarios: [],
      documentos: [],
      hitos: [
        { id: "H-012-1", nombre: "Karina - EX-2026-33988163-APN-DGDA#MEC en DIYAN#MDYTE", responsable: "Privada", estado: "En curso", fechaLimite: "2026-05-31" },
        { id: "H-012-2", nombre: "Luisina - EX-2026-36272697-APN-SICYT#JGM en DIYAN#MDYTE", responsable: "Privada", estado: "En curso", fechaLimite: "2026-05-31" }
      ]
    }
  ],
  expedientes: [
    {
      numero: "EX-2022-94776460-APN-CEFISU#MDS",
      gde: "https://gde.example/EX-2022-94776460",
      temaAsociado: "NRU 1763 - Barrio Avenida de las Americas",
      fechaInicio: "2026-05-19",
      fechaLimite: "2026-06-15",
      ultimaActualizacion: "2026-05-26",
      responsable: "Alejandro B",
      estado: "Activo",
      documentos: ["Certificado_avance_N02.pdf"],
      historial: [{ event: "Apertura expediente", at: "2026-05-19" }]
    },
    {
      numero: "EX-2022-130503405-APN-CEFISU#MDS",
      gde: "https://gde.example/EX-2022-130503405",
      temaAsociado: "Loteo Parque Sur - Catamarca",
      fechaInicio: "2026-05-19",
      fechaLimite: "2026-06-12",
      ultimaActualizacion: "2026-05-23",
      responsable: "Luis Mesones",
      estado: "Activo",
      documentos: [],
      historial: [{ event: "Apertura expediente", at: "2026-05-19" }]
    },
    {
      numero: "EX-2026-33988163-APN-DGDA#MEC",
      gde: "https://gde.example/EX-2026-33988163",
      temaAsociado: "Designaciones KL y LR",
      fechaInicio: "2026-05-15",
      fechaLimite: "2026-06-05",
      ultimaActualizacion: "2026-05-28",
      responsable: "Privada",
      estado: "Activo",
      documentos: [],
      historial: [{ event: "Apertura expediente", at: "2026-05-15" }]
    }
  ],
  documentos: [
    { id: "D-001", nombre: "Certificado_avance_N02.pdf", tipo: "PDF", relacionado: "EX-2022-94776460-APN-CEFISU#MDS", fecha: "2026-05-08" },
    { id: "D-002", nombre: "Dictamen_auditor.pdf",       tipo: "PDF", relacionado: "T-002", fecha: "2026-05-20" },
    { id: "D-003", nombre: "Observaciones.pdf",           tipo: "PDF", relacionado: "T-002", fecha: "2026-05-25" }
  ],
  responsables: [
    { id: "R-001", nombre: "Jorge",     apellido: "Rios",    email: "", dependencia: "SSOyS", cargo: "", usuarioGDE: "" },
    { id: "R-002", nombre: "Alejandro", apellido: "B",       email: "", dependencia: "",      cargo: "", usuarioGDE: "" },
    { id: "R-003", nombre: "Luis",      apellido: "Mesones", email: "", dependencia: "",      cargo: "", usuarioGDE: "" },
    { id: "R-004", nombre: "Gabriela",  apellido: "",        email: "", dependencia: "",      cargo: "", usuarioGDE: "" },
    { id: "R-005", nombre: "Karina",    apellido: "",        email: "", dependencia: "",      cargo: "", usuarioGDE: "" },
    { id: "R-006", nombre: "Marielda",  apellido: "",        email: "", dependencia: "",      cargo: "", usuarioGDE: "" },
    { id: "R-007", nombre: "Luisina",   apellido: "",        email: "", dependencia: "",      cargo: "", usuarioGDE: "" }
  ],
  reuniones: [],
  usuarios: [
    {
      id: "U-001",
      nombre: "Jorge Rios",
      email: "jorgerios.estudio@gmail.com",
      passwordHash: simpleHash("admin123"),
      rol: "Admin",
      activo: true,
      aprobado: true,
      fechaRegistro: "2026-05-01",
      ultimoAcceso: "2026-06-29"
    },
    {
      id: "U-002",
      nombre: "Admin",
      email: "admin@sistema.com",
      passwordHash: simpleHash("admin"),
      rol: "Admin",
      activo: true,
      aprobado: true,
      fechaRegistro: "2026-06-30",
      ultimoAcceso: ""
    }
  ],
  sesion: {
    usuarioId: "U-001",
    loggedAt: "2026-06-29"
  }
};

// =========================================================
// State helpers
// =========================================================
function escHtml(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function migrateState(s) {
  if (!s.config) s.config = { currentUser: "Jorge Rios", areaDefault: "SSOyS", rol: "Admin" };
  if (!s.config.rol) s.config.rol = "Admin";

  const today = fmtDate(new Date());

  (s.temas || []).forEach((t) => {
    if (t.tipo !== undefined && t.programa === undefined) { t.programa = t.tipo; delete t.tipo; }
    if (!t.hitos) t.hitos = [];
    if (!t.comentarios) t.comentarios = [];
    if (!t.documentos) t.documentos = [];
    if (!t.historial) t.historial = [{ event: "Importado", at: t.fechaInicio || today, by: "sistema" }];
  });

  if (!s.responsables) {
    const names = unique([
      ...s.temas.map((t) => t.responsable),
      ...s.temas.flatMap((t) => t.hitos.map((h) => h.responsable))
    ]).filter((n) => n && n !== "Privada" && n !== "Jurisdiccion");
    s.responsables = names.map((name, i) => {
      const parts = name.trim().split(/\s+/);
      return { id: `R-${String(i+1).padStart(3,"0")}`, nombre: parts[0]||name, apellido: parts.slice(1).join(" "), email: "", dependencia: "" };
    });
  }

  if (!s.expedientes) s.expedientes = [];
  if (!s.documentos) s.documentos = [];
  if (!s.reuniones) s.reuniones = [];
  if (!s.usuarios) s.usuarios = structuredClone(seedData.usuarios);
  if (!s.usuarios.find((u) => u.email === "admin@sistema.com")) {
    s.usuarios.push({ id: "U-002", nombre: "Admin", email: "admin@sistema.com", passwordHash: simpleHash("admin"), rol: "Admin", activo: true, aprobado: true, fechaRegistro: "2026-06-30", ultimoAcceso: "" });
  }
  if (!s.sesion) s.sesion = { usuarioId: "U-001", loggedAt: new Date().toISOString() };
  return s;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(seedData);
  try { return migrateState(JSON.parse(raw)); }
  catch { return structuredClone(seedData); }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

const charts = {};

function getDark() { return document.documentElement.dataset.theme === "dark"; }

// =========================================================
// Session & permissions
// =========================================================
function getSessionUser() {
  if (!state.sesion || !state.sesion.usuarioId) return null;
  return state.usuarios.find((u) => u.id === state.sesion.usuarioId) || null;
}

function getCurrentRol() {
  const u = getSessionUser();
  if (u) return u.rol;
  return state.config.rol || "Admin";
}

function puedeEditar() { const r = getCurrentRol(); return r === "Admin" || r === "Editor"; }
function puedeEliminar() { return getCurrentRol() === "Admin"; }
function esAdmin() { return getCurrentRol() === "Admin"; }
function activeUserName() { return getSessionUser()?.nombre || state.config.currentUser; }
function activeUserId() { return getSessionUser()?.id || null; }

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

function buildGdeBlock(numero, gde) {
  if (!numero) return "";
  return `
    <div class="gde-block">
      <div class="gde-block-head">Expediente GDE</div>
      <div class="gde-number">
        <a href="#" class="gde-link" data-gde-open="${escHtml(numero)}">${escHtml(numero)}</a>
      </div>
      ${gde ? `<div style="font-size:11px;color:var(--muted);margin-top:2px">Enlace directo disponible</div>` : ""}
    </div>`;
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
  agendaLista:        $("agendaLista"),
  agendaCalendario:   $("agendaCalendario"),
  tableAgendaLista:   $("tableAgendaLista"),
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
  fPrograma:          $("fPrograma"),
  fExpediente:        $("fExpediente"),
  fPrioridad:         $("fPrioridad"),
  btnMisTemas:        $("btnMisTemas"),
  calGrid:            $("calGrid"),
  calTitle:           $("calTitle")
};

let calCursor = new Date(); calCursor.setDate(1);
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

  const devBypass = localStorage.getItem("sgtemas_dev_bypass") === "true";
  if (devBypass && !state.sesion.usuarioId) {
    state.sesion = { usuarioId: "U-001", loggedAt: new Date().toISOString() };
  }

  if (!state.sesion || !state.sesion.usuarioId) {
    showLoginScreen();
  } else {
    showApp();
    renderAll();
  }
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

  document.querySelectorAll(".tabs .tab").forEach((t) => {
    t.addEventListener("click", () => switchAgendaTab(t.dataset.tab));
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
    [els.fResponsable, els.fEstado, els.fPrograma, els.fExpediente, els.fPrioridad].forEach((s) => (s.value = ""));
    showMisTemasOnly = false;
    els.btnMisTemas.classList.remove("mis-temas-active");
    renderAll();
  });

  [els.fResponsable, els.fEstado, els.fPrograma, els.fExpediente, els.fPrioridad].forEach((s) => s.addEventListener("change", renderAll));
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

  $("calToday").addEventListener("click", () => { calCursor = new Date(); calCursor.setDate(1); renderCalendar(); });
  $("calPrev").addEventListener("click", () => { calCursor.setMonth(calCursor.getMonth() - 1); renderCalendar(); });
  $("calNext").addEventListener("click", () => { calCursor.setMonth(calCursor.getMonth() + 1); renderCalendar(); });

  $("saveConfig").addEventListener("click", () => {
    const user = getSessionUser();
    if (!user) return;
    const nombre = els.cfgNombre.value.trim();
    const email = els.cfgEmail.value.trim().toLowerCase();
    if (!nombre) { showToast("El nombre es requerido"); return; }
    if (!email) { showToast("El email es requerido"); return; }
    if (state.usuarios.some((u) => u.id !== user.id && u.email.toLowerCase() === email)) {
      showToast("Ya existe un usuario con ese email"); return;
    }
    user.nombre = nombre;
    user.email = email;
    saveState();
    renderAll();
    showToast("Datos guardados");
  });

  $("savePassword").addEventListener("click", () => {
    const user = getSessionUser();
    if (!user) return;
    const actual = els.cfgPassActual.value;
    const nueva = els.cfgPassNueva.value;
    const confirmar = els.cfgPassConfirmar.value;
    if (simpleHash(actual) !== user.passwordHash) { showToast("Contraseña actual incorrecta"); return; }
    if (nueva.length < 4) { showToast("La nueva contraseña debe tener al menos 4 caracteres"); return; }
    if (nueva !== confirmar) { showToast("Las contraseñas no coinciden"); return; }
    user.passwordHash = simpleHash(nueva);
    saveState();
    els.cfgPassActual.value = "";
    els.cfgPassNueva.value = "";
    els.cfgPassConfirmar.value = "";
    showToast("Contraseña actualizada");
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
    logoutBtn.addEventListener("click", () => {
      if (!confirm("Cerrar sesion?")) return;
      state.sesion = { usuarioId: null, loggedAt: "" };
      saveState();
      showLoginScreen();
    });
  }
}

function showView(view) {
  if (view === "usuarios" && !esAdmin()) view = "dashboard";
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  const target = document.getElementById(`view-${view}`);
  if (target) target.classList.add("active");
  if (view === "agenda") renderAgenda();
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
    els.dropdownLastLogin.textContent = `Ultima conexion: ${fmtDateTimeNice(state.sesion.loggedAt)}`;
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
  $("loginFormEl").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("loginEmail").value.trim().toLowerCase();
    const pass  = simpleHash($("loginPass").value);
    const user  = state.usuarios.find((u) => u.email.toLowerCase() === email && u.passwordHash === pass);
    const msg   = $("loginMsg");
    if (!user) { msg.innerHTML = `<div class="login-error">Email o contraseña incorrectos.</div>`; return; }
    if (!user.aprobado) { msg.innerHTML = `<div class="login-error">Tu cuenta está pendiente de aprobación.</div>`; return; }
    if (!user.activo)   { msg.innerHTML = `<div class="login-error">Tu cuenta está desactivada.</div>`; return; }
    user.ultimoAcceso = fmtDate(new Date());
    state.sesion = { usuarioId: user.id, loggedAt: new Date().toISOString() };
    saveState();
    showApp();
    renderAll();
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
  $("regFormEl").addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = $("regMsg");
    const nombre = $("regNombre").value.trim();
    const email  = $("regEmail").value.trim().toLowerCase();
    const pass   = $("regPass").value;
    const pass2  = $("regPass2").value;
    if (pass !== pass2) { msg.innerHTML = `<div class="login-error">Las contraseñas no coinciden.</div>`; return; }
    if (pass.length < 4) { msg.innerHTML = `<div class="login-error">La contraseña debe tener al menos 4 caracteres.</div>`; return; }
    if (state.usuarios.find((u) => u.email.toLowerCase() === email)) {
      msg.innerHTML = `<div class="login-error">Ya existe un usuario con ese email.</div>`; return;
    }
    state.usuarios.push({
      id: nextUsuarioId(),
      nombre,
      email,
      passwordHash: simpleHash(pass),
      rol: "Viewer",
      activo: true,
      aprobado: false,
      fechaRegistro: fmtDate(new Date()),
      ultimoAcceso: ""
    });
    saveState();
    msg.innerHTML = `<div class="login-success">Tu solicitud fue enviada. El administrador debe aprobarla antes de que puedas ingresar.</div>`;
    setTimeout(() => renderLogin(), 3500);
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
      <td>${u.ultimoAcceso ? fmtDateNice(u.ultimoAcceso) : "—"}</td>
      <td>
        <div style="display:flex;gap:6px">
          <select class="pill" style="font-size:12px;padding:3px 8px" data-rol-select="${u.id}">
            ${["Admin","Editor","Viewer"].map((r) => `<option ${u.rol === r ? "selected" : ""}>${r}</option>`).join("")}
          </select>
          ${u.id !== state.sesion.usuarioId ? `<button class="ghost" style="font-size:12px;color:#dc2626" data-desactivar="${u.id}">Desactivar</button>` : ""}
          ${u.id !== state.sesion.usuarioId ? `<button class="ghost" style="font-size:12px;color:#dc2626" data-eliminar="${u.id}">Eliminar</button>` : ""}
        </div>
      </td>
    </tr>`).join("") || `<tr><td colspan="5" style="color:var(--muted);text-align:center">Sin usuarios.</td></tr>`;

  tbActivos.querySelectorAll("[data-eliminar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const u = state.usuarios.find((x) => x.id === btn.dataset.eliminar);
      if (u && confirm(`Eliminar a ${u.nombre} definitivamente?`)) {
        state.usuarios = state.usuarios.filter((x) => x.id !== u.id);
        saveState(); renderUsuarios();
      }
    });
  });

  tbActivos.querySelectorAll("[data-rol-select]").forEach((sel) => {
    sel.addEventListener("change", () => {
      const u = state.usuarios.find((x) => x.id === sel.dataset.rolSelect);
      if (u) { u.rol = sel.value; saveState(); showToast("Rol actualizado"); }
    });
  });
  tbActivos.querySelectorAll("[data-desactivar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const u = state.usuarios.find((x) => x.id === btn.dataset.desactivar);
      if (u && confirm(`Desactivar a ${u.nombre}?`)) { u.activo = false; saveState(); renderUsuarios(); }
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
    btn.addEventListener("click", () => {
      const u = state.usuarios.find((x) => x.id === btn.dataset.aprobar);
      const rolSel = document.getElementById(`rolAprobacion-${u.id}`);
      if (u) { u.aprobado = true; u.rol = rolSel ? rolSel.value : "Viewer"; saveState(); renderUsuarios(); showToast(`${u.nombre} aprobado`); }
    });
  });
  tbPendientes.querySelectorAll("[data-rechazar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const u = state.usuarios.find((x) => x.id === btn.dataset.rechazar);
      if (u && confirm(`Rechazar solicitud de ${u.nombre}?`)) {
        state.usuarios = state.usuarios.filter((x) => x.id !== u.id);
        saveState(); renderUsuarios();
      }
    });
  });
}

function switchAgendaTab(tab) {
  document.querySelectorAll(".tabs .tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
  els.agendaKanban.classList.toggle("hidden", tab !== "kanban");
  els.agendaLista.classList.toggle("hidden", tab !== "lista");
  els.agendaCalendario.classList.toggle("hidden", tab !== "calendario");
  if (tab === "calendario") renderCalendar();
  if (tab === "lista") renderAgendaLista();
}

// =========================================================
// Filter helpers
// =========================================================
function unique(arr) { return [...new Set(arr.filter(Boolean))]; }

function fillFilterOptions() {
  const visibles = state.temas.filter(isTemaVisible);
  fillSelect(els.fResponsable, unique(visibles.map((t) => t.responsable)), "Responsable");
  fillSelect(els.fEstado, STATES, "Estado");
  fillSelect(els.fPrograma, unique(visibles.map((t) => t.programa)), "Programa");
  fillSelect(els.fExpediente, unique(visibles.map((t) => t.expediente)), "Expediente");
  fillSelect(els.fPrioridad, ["Alta", "Media", "Baja"], "Prioridad");
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
    if (els.fPrograma.value && t.programa !== els.fPrograma.value) return false;
    if (els.fExpediente.value && t.expediente !== els.fExpediente.value) return false;
    if (els.fPrioridad.value && t.prioridad !== els.fPrioridad.value) return false;
    if (!q) return true;
    const blobTema = [t.id, t.nombre, t.expediente, t.responsable, t.programa, t.solicitante, t.descripcion, t.estado].join(" ").toLowerCase();
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
  renderExpedientes();
  renderAlertas();
  renderReportes();
  renderResponsables();
  renderConfig();
  updateSortHeaders();
  updateHeaderForRole();
  saveState();
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
    n.addEventListener("click", () => openTemaDrawer(n.dataset.tema))
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
      row.addEventListener("click", () => openTemaDrawer(row.dataset.tema))
    );
  }

  // Progreso por programa
  const progEl = $("progresoPorPrograma");
  if (progEl) {
    const programas = unique(temas.map((t) => t.programa)).filter(Boolean);
    if (!programas.length) {
      progEl.innerHTML = `<p style="color:var(--muted)">Sin datos.</p>`;
    } else {
      progEl.innerHTML = programas.map((prog) => {
        const ptemas = temas.filter((t) => t.programa === prog);
        const cerrados = ptemas.filter((t) => t.estado === "Cerrado").length;
        const total = ptemas.length;
        const pct = total > 0 ? Math.round((cerrados / total) * 100) : 0;
        const byEstado = countBy(ptemas, "estado");
        const dominante = Object.entries(byEstado).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
        return `
          <div class="prog-row">
            <span class="prog-name" title="${escHtml(prog)}">${escHtml(prog)}</span>
            <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>
            <span class="prog-count">${cerrados}/${total} cerrados</span>
            <span class="badge ${badgeClass(dominante)}">${escHtml(dominante)}</span>
          </div>`;
      }).join("");
    }
  }

  // Alertas resumen lateral
  const alerts = buildAlerts(temas);
  const alertCount = alerts.length;
  if (els.notifDot) els.notifDot.textContent = alertCount;
  els.alertList.innerHTML = alerts.slice(0, 5).map((a) => `
    <div class="alert-item lvl-${a.level.toLowerCase()}">
      <div class="icon">${a.level === "Rojo" ? "⛔" : a.level === "Naranja" ? "⚠" : "•"}</div>
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
      n.addEventListener("click", () => openTemaDrawer(n.dataset.tema))
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
                <div class="title">${t.privado ? "🔒 " : ""}${escHtml(t.nombre)}</div>
                <div class="meta">${t.id} · ${escHtml(t.programa || "")}</div>
                <div class="meta">${respDisplay(t.responsable)}</div>
                ${hitoBar}
                <div class="row">
                  <span class="date-pill ${dateTone(t.fechaLimite, t.estado)}" title="Vencimiento">
                    <span class="ico">📅</span>${fmtDateNice(t.fechaLimite)}
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
  renderAgendaLista();
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
    card.addEventListener("click", () => openTemaDrawer(card.dataset.id));
  });
  els.agendaKanban.querySelectorAll(".col").forEach((col) => {
    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.target.closest(".kcard")) return;
      const dragging = els.agendaKanban.querySelector(".kcard.dragging");
      const kcards = col.querySelector(".kcards");
      if (dragging && kcards && dragging.parentElement !== kcards) kcards.appendChild(dragging);
    });
    col.addEventListener("drop", () => {
      if (!dragId) return;
      const tema = state.temas.find((t) => t.id === dragId);
      if (tema) {
        setTemaEstado(tema, col.dataset.estado);
        const orderedIds = Array.from(col.querySelectorAll(".kcard")).map((c) => c.dataset.id);
        reorderColumn(col.dataset.estado, orderedIds);
      }
      dragId = "";
      renderAll();
    });
  });
  els.agendaKanban.querySelectorAll("[data-add-estado]").forEach((btn) => {
    btn.addEventListener("click", () => openTemaForm(null, btn.dataset.addEstado));
  });
}

function reorderColumn(estado, orderedIds) {
  const grouped = state.temas.filter((t) => t.estado === estado);
  if (!grouped.length) return;
  const insertAt = state.temas.findIndex((t) => t.estado === estado);
  state.temas = state.temas.filter((t) => t.estado !== estado);
  const orderedTemas = orderedIds.map((id) => grouped.find((t) => t.id === id)).filter(Boolean);
  state.temas.splice(insertAt, 0, ...orderedTemas);
}

function setTemaEstado(tema, estado) {
  if (tema.estado === estado) return;
  tema.estado = estado;
  tema.ultimaActualizacion = fmtDate(new Date());
  tema.historial.push({ event: `Cambio a ${estado}`, at: tema.ultimaActualizacion, by: activeUserName() });
  if (estado === "Cerrado") { tema.fechaCierre = fmtDate(new Date()); tema.cerradoPor = activeUserName(); }
}

function renderAgendaLista() {
  const temas = sortTableData(getFilteredTemas(), "tableAgendaLista");
  els.tableAgendaLista.innerHTML = temas.map((t) => {
    const totalH = t.hitos.length;
    const doneH = t.hitos.filter((h) => h.estado === "Cerrado").length;
    const hitosCell = totalH > 0 ? `${doneH}/${totalH}` : "-";
    return `
    <tr data-tema="${t.id}">
      <td>${t.id}</td>
      <td>${escHtml(t.nombre)}</td>
      <td>${escHtml(t.programa || "-")}</td>
      <td>${t.expediente || "-"}</td>
      <td>${respDisplay(t.responsable)}</td>
      <td>${badge(t.estado)}</td>
      <td>${hitosCell}</td>
      <td><span class="prio prio-${(t.prioridad || "media").toLowerCase()}">${t.prioridad || "Media"}</span></td>
      <td>${fmtDateNice(t.fechaLimite)}</td>
    </tr>`;
  }).join("");
  els.tableAgendaLista.querySelectorAll("[data-tema]").forEach((n) =>
    n.addEventListener("click", () => openTemaDrawer(n.dataset.tema))
  );
}

// =========================================================
// CALENDARIO
// =========================================================
function renderCalendar() {
  const year = calCursor.getFullYear();
  const month = calCursor.getMonth();
  els.calTitle.textContent = calCursor.toLocaleDateString("es", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = fmtDate(new Date());
  const events = collectCalendarEvents();
  const weekdays = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
  let html = weekdays.map((w) => `<div class="cal-weekday">${w}</div>`).join("");
  for (let i = 0; i < startWeekday; i++) html += dayCell(new Date(year, month, 1 - (startWeekday - i)), true, events, today);
  for (let d = 1; d <= daysInMonth; d++) html += dayCell(new Date(year, month, d), false, events, today);
  const fill = (7 - ((startWeekday + daysInMonth) % 7)) % 7;
  for (let i = 1; i <= fill; i++) html += dayCell(new Date(year, month + 1, i), true, events, today);
  els.calGrid.innerHTML = html;
  els.calGrid.querySelectorAll("[data-tema]").forEach((n) =>
    n.addEventListener("click", () => openTemaDrawer(n.dataset.tema))
  );
  let dragId = "";
  els.calGrid.querySelectorAll(".cal-event").forEach((ev) => ev.addEventListener("dragstart", () => { dragId = ev.dataset.tema; }));
  els.calGrid.querySelectorAll(".cal-day").forEach((day) => {
    day.addEventListener("dragover", (e) => e.preventDefault());
    day.addEventListener("drop", () => {
      if (!dragId) return;
      const tema = state.temas.find((t) => t.id === dragId);
      if (tema) { tema.fechaLimite = day.dataset.date; tema.historial.push({ event: "Fecha modificada por calendario", at: fmtDate(new Date()), by: activeUserName() }); renderAll(); }
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
function renderExpedientes() {
  const expedientes = sortTableData(state.expedientes, "tableExpedientes");
  els.tableExpedientes.innerHTML = expedientes.map((e) => {
    const temaRel = state.temas.find((t) => t.expediente === e.numero && isTemaVisible(t));
    const hitoRel = temaRel ? temaRel.hitos.find((h) => h.estado !== "Cerrado") || temaRel.hitos[0] : null;
    const hitoCell = hitoRel ? `<span title="${escHtml(hitoRel.nombre)}">${escHtml(hitoRel.nombre.slice(0, 30))}${hitoRel.nombre.length > 30 ? "…" : ""}</span>` : "-";
    const temaLink = temaRel ? `<a href="#" class="link" data-open-tema="${temaRel.id}">${escHtml(e.temaAsociado)}</a>` : escHtml(e.temaAsociado);
    return `
    <tr data-exp="${escHtml(e.numero)}">
      <td>${escHtml(e.numero)}</td>
      <td><a href="#" class="gde-link" data-gde-open="${escHtml(e.numero)}">${e.gde ? "GDE" : "—"}</a></td>
      <td>${temaLink}</td>
      <td>${hitoCell}</td>
      <td>${respDisplay(e.responsable)}</td>
      <td>${fmtDateNice(e.fechaInicio)}</td>
      <td>${fmtDateNice(e.fechaLimite)}</td>
      <td>${e.estado}</td>
      <td><button class="ghost" data-exp-edit="${escHtml(e.numero)}">Editar</button></td>
    </tr>`;
  }).join("");

  els.tableExpedientes.querySelectorAll("[data-gde-open]").forEach((a) => {
    a.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); openGDE(a.dataset.gdeOpen); });
  });
  els.tableExpedientes.querySelectorAll("[data-open-tema]").forEach((a) => {
    a.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); openTemaDrawer(a.dataset.openTema); });
  });
  els.tableExpedientes.querySelectorAll("[data-exp]").forEach((n) => {
    n.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-exp-edit]") || ev.target.closest("[data-gde-open]") || ev.target.closest("[data-open-tema]")) return;
      openExpedienteDrawer(n.dataset.exp);
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
function buildAlerts(temas) {
  const out = [];
  const today = fmtDate(new Date());
  temas.forEach((t) => {
    if (t.estado === "Cerrado") return;
    const base = { temaId: t.id, temaPadre: "", responsable: t.responsable, expediente: t.expediente, fechaLimite: t.fechaLimite };
    const d = daysUntil(t.fechaLimite);
    if (d < 0) out.push({ ...base, level: "Rojo",     tipo: "Vencimiento tema", tema: t.nombre });
    else if (d <= 3) out.push({ ...base, level: "Naranja",  tipo: "Vence pronto",    tema: t.nombre });
    else if (d <= 7) out.push({ ...base, level: "Amarillo", tipo: "Esta semana",     tema: t.nombre });
    if (daysBetween(t.ultimaActualizacion, today) > 14) {
      out.push({ ...base, level: "Naranja", tipo: "Sin actividad", tema: `${t.nombre} (sin actualizar)` });
    }
    t.hitos.forEach((h) => {
      if (h.estado === "Cerrado") return;
      const dh = daysUntil(h.fechaLimite);
      const hbase = { temaId: t.id, temaPadre: t.nombre, responsable: h.responsable, expediente: t.expediente, fechaLimite: h.fechaLimite, esHito: true };
      if (dh < 0) out.push({ ...hbase, level: "Rojo",    tipo: "Vencimiento hito",   tema: h.nombre });
      else if (dh <= 3) out.push({ ...hbase, level: "Naranja", tipo: "Hito vence pronto", tema: h.nombre });
    });
  });
  return out;
}

function renderAlertas() {
  const alerts = sortTableData(buildAlerts(getFilteredTemas()), "tableAlertas");
  els.tableAlertas.innerHTML = alerts.map((a) => `
    <tr class="clickable-row" data-tema="${a.temaId}" title="Clic para abrir y editar el tema">
      <td><span class="badge ${a.level === "Rojo" ? "b-vencido" : a.level === "Naranja" ? "b-bloqueado" : "b-pendiente"}">${a.level}</span></td>
      <td>${escHtml(a.tipo)}</td>
      <td>${escHtml(a.tema)}</td>
      <td>${a.temaPadre ? escHtml(a.temaPadre) : "-"}</td>
      <td>${respDisplay(a.responsable)}</td>
      <td>${a.expediente || "-"}</td>
      <td>${fmtDateNice(a.fechaLimite)}</td>
      <td><span class="row-edit-hint">✎ Editar</span></td>
    </tr>`).join("") || `<tr><td colspan="8" style="color:var(--muted);text-align:center">Sin alertas activas.</td></tr>`;

  els.tableAlertas.querySelectorAll("[data-tema]").forEach((row) =>
    row.addEventListener("click", () => openTemaDrawer(row.dataset.tema))
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
    ["Temas por programa",     objToText(countBy(temas, "programa"))],
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
function openTemaDrawer(temaId, activeTab = "detalle") {
  const tema = state.temas.find((t) => t.id === temaId);
  if (!tema) return;
  if (!isTemaVisible(tema)) { showToast("Este tema es privado"); return; }

  const totalH = tema.hitos.length;
  const doneH = tema.hitos.filter((h) => h.estado === "Cerrado").length;
  const pct = totalH > 0 ? Math.round(doneH / totalH * 100) : 0;

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
        <div style="font-size:12.5px"><strong>${c.by}</strong>: ${escHtml(c.text)}</div>
        <div style="font-size:11px;color:var(--muted)">${fmtDateNice(c.at)}</div>
      </div>
    </div>`).join("");

  const docHtml = tema.documentos.length
    ? tema.documentos.map((d) => `
      <div class="doc-item">
        <span>📄 ${escHtml(d)}</span>
      </div>`).join("")
    : `<p style="color:var(--muted)">Sin documentos adjuntos.</p>`;

  els.drawerBody.innerHTML = `
    <div class="detail-head">
      <div class="title-row">
        <h2>${escHtml(tema.nombre)}</h2>
        <span class="id-pill">${tema.id}</span>
        <span class="badge ${badgeClass(tema.estado)}">${tema.estado}</span>
        ${tema.privado ? `<span class="id-pill" title="Solo visible para quien lo creo">🔒 Privado</span>` : ""}
      </div>
    </div>

    <div class="drawer-tabs">
      <button class="dtab active" data-dtab="detalle">Detalle</button>
      <button class="dtab" data-dtab="hitos">Hitos ${totalH > 0 ? `(${doneH}/${totalH})` : ""}</button>
      <button class="dtab" data-dtab="actividad">Actividad</button>
      <button class="dtab" data-dtab="documentos">Documentos${tema.documentos.length > 0 ? ` (${tema.documentos.length})` : ""}</button>
    </div>

    <div class="drawer-tab-content">
      <!-- Detalle (solo lectura — usar "Editar tema" para modificar) -->
      <div class="dtab-pane active" id="dtab-detalle">
        <div class="detalle-layout">
          <div class="detail-grid">
            <div class="k">Responsable</div><div class="v">${respDisplay(tema.responsable)}</div>
            <div class="k">Solicitante</div><div class="v">${escHtml(tema.solicitante || "-")}</div>
            <div class="k">Programa</div><div class="v">${escHtml(tema.programa || "-")}</div>
            <div class="k">Prioridad</div><div class="v"><span class="prio prio-${(tema.prioridad || "media").toLowerCase()}">${tema.prioridad || "Media"}</span></div>
            <div class="k">Inicio</div><div class="v">${fmtDateNice(tema.fechaInicio)}</div>
            <div class="k">Vencimiento</div><div class="v"><span class="fecha-with-badge"><span>${fmtDateNice(tema.fechaLimite)}</span>${diasRestantesBadge(tema.fechaLimite)}</span></div>
            <div class="k">Estado</div><div class="v">${badge(tema.estado)}</div>
            ${tema.descripcion ? `<div class="k">Descripcion</div><div class="v" style="white-space:pre-wrap">${escHtml(tema.descripcion)}</div>` : ""}
          </div>
          ${buildGdeBlock(tema.expediente, tema.gde)}
        </div>
      </div>

      <!-- Hitos -->
      <div class="dtab-pane" id="dtab-hitos">
        <div id="hitosGanttWrap">${renderMiniGantt(tema)}</div>
        ${totalH > 0 ? `
        <div class="hito-progress-wrap" style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:4px">
            <span>Progreso de hitos</span><span>${doneH}/${totalH} (${pct}%)</span>
          </div>
          <div class="hito-progress-bar"><div class="hito-progress-fill" style="width:${pct}%"></div></div>
        </div>` : ""}
        <div class="hito-compact-list" id="hitosContainer">${renderHitosCompactList(tema, { readonly: true })}</div>
      </div>

      <!-- Actividad -->
      <div class="dtab-pane" id="dtab-actividad">
        <div class="activity-log" id="activityLog">
          ${historialHtml}
          ${comentariosHtml}
        </div>
      </div>

      <!-- Documentos -->
      <div class="dtab-pane" id="dtab-documentos">
        <div id="docList">${docHtml}</div>
      </div>
    </div>

    <div class="drawer-actions">
      ${puedeEditar() ? `<button class="primary" id="editTemaBtn">✎ Editar tema</button>` : ""}
      ${puedeEliminar() ? `<button class="action danger" id="deleteTemaBtn">🗑 Eliminar tema</button>` : ""}
    </div>
  `;

  els.drawer.classList.add("open");
  els.drawerOverlay.classList.add("open");
  drawerHasUnsavedChanges = false;
  currentDrawerTemaId = tema.id;

  // Tab switching
  els.drawerBody.querySelectorAll(".dtab").forEach((tab) => {
    tab.addEventListener("click", () => {
      els.drawerBody.querySelectorAll(".dtab").forEach((x) => x.classList.remove("active"));
      els.drawerBody.querySelectorAll(".dtab-pane").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const pane = document.getElementById(`dtab-${tab.dataset.dtab}`);
      if (pane) pane.classList.add("active");
    });
  });

  if (activeTab !== "detalle") {
    const tabBtn = els.drawerBody.querySelector(`.dtab[data-dtab="${activeTab}"]`);
    if (tabBtn) tabBtn.click();
  }

  $("editTemaBtn")?.addEventListener("click", () => openTemaForm(tema));

  $("deleteTemaBtn")?.addEventListener("click", () => {
    if (!confirm("Eliminar este tema? Esta accion no se puede deshacer.")) return;
    state.temas = state.temas.filter((t) => t.id !== tema.id);
    closeDrawer(); renderAll();
  });

  // Wire GDE links inside drawer
  els.drawerBody.querySelectorAll("[data-gde-open]").forEach((a) => {
    a.addEventListener("click", (e) => { e.preventDefault(); openGDE(a.dataset.gdeOpen); });
  });
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
    <article class="card" style="margin-top:8px"><h4 style="margin-bottom:8px">Documentos</h4>${ex.documentos.length ? ex.documentos.map((d) => `<p>📄 ${escHtml(d)}</p>`).join("") : "<p style='color:var(--muted)'>Sin documentos.</p>"}</article>
    <article class="card" style="margin-top:8px"><h4 style="margin-bottom:8px">Historial</h4>${ex.historial.map((h) => `<p>${fmtDateNice(h.at)} · ${escHtml(h.event)}</p>`).join("")}</article>
    <article class="card" style="margin-top:8px"><h4 style="margin-bottom:8px">Responsables</h4>${responsables.map((r) => `<p>👤 ${escHtml(r)}</p>`).join("")}</article>
  `;
  els.drawer.classList.add("open");
  els.drawerOverlay.classList.add("open");
  els.drawerBody.querySelectorAll("[data-gde-open]").forEach((a) => {
    a.addEventListener("click", (e) => { e.preventDefault(); openGDE(a.dataset.gdeOpen); });
  });
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
  function handleSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.nombre?.trim()) { showToast("El nombre es requerido"); return; }
    const newResp = { id: nextRespId(), nombre: data.nombre.trim(), apellido: (data.apellido || "").trim(), email: data.email || "", cargo: data.cargo || "", dependencia: data.dependencia || "", usuarioGDE: "" };
    state.responsables.push(newResp);
    saveState();
    dlg.close();
    if (onSave) onSave([newResp.nombre, newResp.apellido].filter(Boolean).join(" "));
  }
  dlg.addEventListener("close", () => form.removeEventListener("submit", handleSubmit), { once: true });
  form.addEventListener("submit", handleSubmit);
  document.getElementById("cancelNewRespBtn").onclick = () => dlg.close();
  dlg.showModal();
}

// =========================================================
// Dias restantes badge (reuses badge/b-* palette: verde >7, amarillo 0-7, rojo <0)
// =========================================================
function diasRestantesInfo(fechaLimite) {
  const d = daysUntil(fechaLimite);
  const cls = d > 7 ? "b-cerrado" : d >= 0 ? "b-bloqueado" : "b-pendiente";
  const text = d >= 0 ? `+${d} d` : `${d} d`;
  return { dias: d, cls, text };
}

function diasRestantesBadge(fechaLimite, id) {
  const idAttr = id ? ` id="${id}"` : "";
  if (!fechaLimite) return `<span class="badge dias-rest-badge"${idAttr}></span>`;
  const { cls, text } = diasRestantesInfo(fechaLimite);
  return `<span class="badge dias-rest-badge ${cls}"${idAttr}>${text}</span>`;
}

function wireDiasBadge(inputEl, badgeEl) {
  if (!inputEl || !badgeEl) return;
  inputEl.addEventListener("input", () => {
    if (!inputEl.value) { badgeEl.textContent = ""; badgeEl.className = "badge dias-rest-badge"; return; }
    const { cls, text } = diasRestantesInfo(inputEl.value);
    badgeEl.className = `badge dias-rest-badge ${cls}`;
    badgeEl.textContent = text;
  });
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

// =========================================================
// Mini gantt (Hitos tab)
// =========================================================
function renderMiniGantt(tema) {
  const hitos = tema.hitos || [];
  if (!hitos.length) return `<p style="color:var(--muted);font-size:12.5px">Sin hitos para mostrar en el cronograma.</p>`;

  const toDate = (s) => new Date((s || fmtDate(new Date())) + "T00:00:00");
  const starts = [tema.fechaInicio, ...hitos.map((h) => h.fechaInicio || h.fechaLimite)].filter(Boolean).sort();
  const ends   = [tema.fechaLimite, ...hitos.map((h) => h.fechaLimite)].filter(Boolean).sort();
  const rStart = toDate(starts[0]);
  let rEnd = toDate(ends[ends.length - 1]);
  if (rEnd <= rStart) rEnd = new Date(rStart.getTime() + 86400000 * 7);
  const totalMs = rEnd - rStart;
  const today = toDate(fmtDate(new Date()));
  const todayPct = clamp(((today - rStart) / totalMs) * 100, 0, 100);

  // .gantt-row-label is 150px wide with an 8px gap before the track — axis marks and
  // the "today" line must offset by that same amount to line up with the bars below.
  const trackOffset = "158px";
  const posCalc = (pct) => `calc(${trackOffset} + (100% - ${trackOffset}) * ${(pct / 100).toFixed(4)})`;

  const markCount = 4;
  const marks = Array.from({ length: markCount }).map((_, i) => {
    const t = new Date(rStart.getTime() + (totalMs * i) / (markCount - 1));
    const pct = (i / (markCount - 1)) * 100;
    return `<span class="gantt-mark" style="left:${posCalc(pct)}">${fmtDateNice(fmtDate(t))}</span>`;
  }).join("");

  const rows = hitos.map((h) => {
    const hs = toDate(h.fechaInicio || h.fechaLimite);
    const he = toDate(h.fechaLimite || h.fechaInicio);
    const left = clamp(((hs - rStart) / totalMs) * 100, 0, 98.5);
    const width = clamp(((he - hs) / totalMs) * 100, 1.5, 100 - left);
    const label = h.nombre.length > 26 ? `${h.nombre.slice(0, 26)}…` : h.nombre;
    return `
      <div class="gantt-row">
        <span class="gantt-row-label" title="${escHtml(h.nombre)}">${escHtml(label)}</span>
        <div class="gantt-track">
          <div class="gantt-bar ${badgeClass(h.estado)}" style="left:${left}%;width:${width}%" title="${escHtml(h.nombre)} · ${escHtml(h.estado)}"></div>
        </div>
      </div>`;
  }).join("");

  return `
    <div class="mini-gantt">
      <div class="gantt-axis">${marks}</div>
      <div class="gantt-body">
        ${rows}
        <div class="gantt-today-line" style="left:${posCalc(todayPct)}" title="Hoy"></div>
      </div>
    </div>`;
}

function renderHitosCompactList(tema, opts = {}) {
  if (!tema.hitos.length) return `<p style="color:var(--muted)">Sin hitos registrados.</p>`;
  const readonly = Boolean(opts.readonly);
  return tema.hitos.map((h) => `
    <div class="hito-compact-row ${h.estado === "Cerrado" ? "done" : ""}" data-hito-id="${h.id}">
      <div class="hito-compact-main">
        <span class="hito-compact-nombre" title="${escHtml(h.nombre)}">${escHtml(h.nombre)}</span>
        ${h.expediente ? `
        <span class="hito-gde-tag" title="Expediente GDE del hito">
          <span class="hito-gde-num">${escHtml(h.expediente)}</span>
          <a href="#" class="gde-link hito-gde-badge" data-gde-open="${escHtml(h.expediente)}">GDE</a>
        </span>` : ""}
      </div>
      ${diasRestantesBadge(h.fechaLimite)}
      ${respAvatarHtml(h.responsable)}
      ${badge(h.estado)}
      ${readonly ? "" : `
      <div class="hito-actions">
        ${puedeEditar() ? `<button type="button" data-task-edit-hito="${h.id}" title="Editar">✎</button>` : ""}
        ${puedeEliminar() ? `<button type="button" class="danger" data-task-delete-hito="${h.id}" title="Eliminar">🗑</button>` : ""}
      </div>`}
    </div>`).join("");
}

// =========================================================
// Task modal — Tab "Tarea"
// =========================================================
function buildTareaTabHtml(draft) {
  return `
    <div class="task-section">
      <div class="task-section-title">Identificación</div>
      <div class="row">
        <label>ID<input value="${escHtml(draft.id)}" readonly /></label>
        <label>Nombre<input name="nombre" id="taskNombreInput" value="${escHtml(draft.nombre || "")}" required /></label>
      </div>
      <label>Programa<input name="programa" value="${escHtml(draft.programa || "")}" /></label>
    </div>

    <div class="task-section">
      <div class="task-section-title">Expediente GDE</div>
      <label style="display:flex;flex-direction:row;align-items:center;gap:8px;font-size:13px;color:var(--text)">
        <input type="checkbox" id="taskHasExpChk" ${draft.expediente ? "checked" : ""} style="width:auto" />
        Este tema tiene expediente GDE asociado
      </label>
      <p id="taskExpNote" class="gde-own-inherited ${draft.expediente ? "hidden" : ""}">Sin expediente asociado al tema · los hitos podrán tener su propio expediente GDE.</p>
      <div data-gde-container class="${draft.expediente ? "" : "hidden"}">${buildGdeToggleWidget(draft.expediente || "")}</div>
    </div>

    <div class="task-section">
      <div class="task-section-title">Asignación</div>
      <div class="row">
        ${buildRespSelector(draft.responsable || state.config.currentUser)}
        <label>Solicitante<input name="solicitante" value="${escHtml(draft.solicitante || "")}" /></label>
      </div>
      <label>Prioridad
        <select name="prioridad">${["Alta","Media","Baja"].map((x) => `<option ${(draft.prioridad || "Media") === x ? "selected" : ""}>${x}</option>`).join("")}</select>
      </label>
    </div>

    <div class="task-section">
      <div class="task-section-title">Fechas</div>
      <div class="row">
        <label>Inicio<input type="date" name="fechaInicio" value="${draft.fechaInicio || fmtDate(new Date())}" /></label>
        <label>Vencimiento
          <span class="fecha-with-badge">
            <input type="date" name="fechaLimite" id="taskFechaLimiteInput" value="${draft.fechaLimite || fmtDate(new Date())}" />
            ${diasRestantesBadge(draft.fechaLimite || fmtDate(new Date()), "taskDiasBadge")}
          </span>
        </label>
      </div>
    </div>

    <details class="task-section">
      <summary class="task-section-title">Descripción y privacidad</summary>
      <label>Descripcion<textarea name="descripcion">${escHtml(draft.descripcion || "")}</textarea></label>
      <label style="display:flex;flex-direction:row;align-items:center;gap:8px;font-size:13px;color:var(--text);margin-top:6px">
        <input type="checkbox" name="privado" ${draft.privado ? "checked" : ""} style="width:auto" />
        Tema privado (solo lo puede ver quien lo creo)
      </label>
    </details>
  `;
}

function wireTareaTabEvents(draft) {
  initRespDropdowns(els.taskForm);
  const gdeContainer = els.taskForm.querySelector("[data-gde-container]");
  if (gdeContainer) wireGdeToggleWidget(gdeContainer.querySelector("[data-gde-toggle]"), draft.expediente || "", "pegar", "tarea-");

  const hasExpChk = document.getElementById("taskHasExpChk");
  const expNote = document.getElementById("taskExpNote");
  hasExpChk?.addEventListener("change", () => {
    gdeContainer?.classList.toggle("hidden", !hasExpChk.checked);
    expNote?.classList.toggle("hidden", hasExpChk.checked);
  });

  const nombreInput = document.getElementById("taskNombreInput");
  const titleEl = document.getElementById("taskModalTitle");
  if (nombreInput && titleEl) {
    nombreInput.addEventListener("input", () => { titleEl.textContent = nombreInput.value.trim() || "Nuevo tema"; });
  }

  wireDiasBadge(document.getElementById("taskFechaLimiteInput"), document.getElementById("taskDiasBadge"));
}

// =========================================================
// Task modal — Tab "Hitos"
// =========================================================
function buildHitosTabHtml(draft) {
  const totalH = draft.hitos.length;
  const doneH = draft.hitos.filter((h) => h.estado === "Cerrado").length;
  const pct = totalH > 0 ? Math.round((doneH / totalH) * 100) : 0;
  return `
    <div id="taskGanttWrap">${renderMiniGantt(draft)}</div>
    <div class="hito-progress-wrap" style="margin:14px 0">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:4px">
        <span>Progreso de hitos</span><span>${doneH}/${totalH} (${pct}%)</span>
      </div>
      <div class="hito-progress-bar"><div class="hito-progress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="hito-compact-list" id="taskHitosList">${renderHitosCompactList(draft)}</div>
    ${puedeEditar() ? `<button type="button" class="col-add" id="taskAddHitoBtn" style="margin-top:10px">+ Agregar hito</button>` : ""}
    <div id="taskHitoInlineFormWrap"></div>
  `;
}

function wireHitosListButtons(draft) {
  const list = document.getElementById("taskHitosList");
  if (!list) return;
  list.querySelectorAll("[data-gde-open]").forEach((a) => {
    a.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); openGDE(a.dataset.gdeOpen); });
  });
  list.querySelectorAll("[data-task-edit-hito]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const hito = draft.hitos.find((h) => h.id === btn.dataset.taskEditHito);
      if (hito) openHitoForm(draft, hito, { onSaved: () => refreshTaskHitosPane(draft) });
    });
  });
  list.querySelectorAll("[data-task-delete-hito]").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteHito(draft, btn.dataset.taskDeleteHito, { onSaved: () => refreshTaskHitosPane(draft) });
    });
  });
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
    document.getElementById("inlineHitoSaveBtn").addEventListener("click", () => {
      const nombre = document.getElementById("inlineHitoNombre").value.trim();
      const fechaLimite = document.getElementById("inlineHitoFecha").value;
      const estado = document.getElementById("inlineHitoEstado").value;
      if (!nombre) { showToast("El nombre del hito es requerido"); return; }
      const newHito = {
        id: `H-${draft.id}-${draft.hitos.length + 1}`,
        nombre, estado, fechaLimite,
        responsable: draft.responsable || activeUserName()
      };
      draft.hitos.push(newHito);
      draft.historial.push({ event: "Hito agregado", at: fmtDate(new Date()), by: activeUserName() });
      draft.ultimaActualizacion = fmtDate(new Date());
      renderAll();
      refreshTaskHitosPane(draft);
    });
  });
}

function refreshTaskHitosPane(draft) {
  const pane = els.taskForm.querySelector('.task-pane[data-task-pane="hitos"]');
  if (!pane) return;
  pane.innerHTML = buildHitosTabHtml(draft);
  wireHitosListButtons(draft);
  wireAddHitoInline(draft);
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
  btn.addEventListener("click", () => {
    const input = document.getElementById("taskNewComment");
    const v = (input?.value || "").trim();
    if (!v) return;
    const currentUser = getSessionUser()?.nombre || state.config.currentUser;
    draft.comentarios = draft.comentarios || [];
    draft.comentarios.push({ by: currentUser, text: v, at: fmtDate(new Date()) });
    draft.ultimaActualizacion = fmtDate(new Date());
    draft.historial.push({ event: `Comentario: "${v.slice(0,40)}"`, at: fmtDate(new Date()), by: currentUser });
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
function buildDocumentosTabHtml(tema) {
  const docHtml = tema.documentos.length
    ? tema.documentos.map((d) => `<div class="doc-item"><span>📄 ${escHtml(d)}</span></div>`).join("")
    : `<p style="color:var(--muted)">Sin documentos adjuntos.</p>`;
  return `
    <div id="taskDocList">${docHtml}</div>
    ${puedeEditar() ? `<button type="button" class="col-add" id="taskUploadDocBtn" style="margin-top:10px">⤴ Adjuntar documento</button>` : ""}
  `;
}

function wireDocumentosTabEvents(draft) {
  const btn = document.getElementById("taskUploadDocBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const name = prompt("Nombre del documento:");
    if (!name) return;
    draft.documentos.push(name);
    state.documentos.push({ id: nextDocId(), nombre: name, tipo: name.split(".").pop().toUpperCase(), relacionado: draft.id, fecha: fmtDate(new Date()) });
    renderAll();
    refreshTaskDocumentosPane(draft);
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
    });
  });
}

function renderTaskFormShell(draft, isEdit) {
  const totalH = draft.hitos.length;
  const doneH = draft.hitos.filter((h) => h.estado === "Cerrado").length;

  els.taskForm.innerHTML = `
    <div class="task-modal-header">
      <div class="task-modal-title-block">
        <span class="id-pill">${escHtml(draft.id)}</span>
        <h3 class="task-modal-title" id="taskModalTitle">${escHtml(draft.nombre) || "Nuevo tema"}</h3>
      </div>
      <div class="task-modal-header-actions">
        <select name="estado" class="task-modal-estado-select">
          ${STATES.map((s) => `<option ${draft.estado === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
        <button type="button" class="task-modal-close" id="taskModalCloseBtn" aria-label="Cerrar">✕</button>
      </div>
    </div>

    <div class="task-modal-tabs">
      <button type="button" class="task-tab active" data-task-tab="tarea">Tarea</button>
      <button type="button" class="task-tab" data-task-tab="hitos">Hitos${totalH > 0 ? ` (${doneH}/${totalH})` : ""}</button>
      <button type="button" class="task-tab" data-task-tab="actividad">Actividad</button>
      <button type="button" class="task-tab" data-task-tab="documentos">Documentos${draft.documentos.length ? ` (${draft.documentos.length})` : ""}</button>
    </div>

    <div class="task-modal-content">
      <div class="task-pane active" data-task-pane="tarea">${buildTareaTabHtml(draft)}</div>
      <div class="task-pane" data-task-pane="hitos">${buildHitosTabHtml(draft)}</div>
      <div class="task-pane" data-task-pane="actividad">${buildActividadTabHtml(draft)}</div>
      <div class="task-pane" data-task-pane="documentos">${buildDocumentosTabHtml(draft)}</div>
    </div>

    <div class="task-modal-footer">
      <button type="button" class="ghost" id="taskModalCancelBtn">Cancelar</button>
      ${puedeEditar() ? `<button class="primary" value="submit">Guardar cambios</button>` : ""}
    </div>
  `;

  wireTaskModalTabs();
  wireTareaTabEvents(draft);
  wireHitosListButtons(draft);
  wireAddHitoInline(draft);
  wireActividadTabEvents(draft);
  wireDocumentosTabEvents(draft);

  document.getElementById("taskModalCloseBtn").addEventListener("click", () => els.modalTask.close());
  document.getElementById("taskModalCancelBtn").addEventListener("click", () => els.modalTask.close());

  els.taskForm.onsubmit = (e) => {
    e.preventDefault();
    if (!puedeEditar()) return;
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
    if (isEdit) {
      Object.assign(draft, data);
      draft.ultimaActualizacion = fmtDate(new Date());
      draft.historial.push({ event: "Tema editado", at: draft.ultimaActualizacion, by: activeUserName() });
    } else {
      Object.assign(draft, data);
      draft.creadoPor = activeUserId();
      draft.ultimaActualizacion = fmtDate(new Date());
      state.temas.push(draft);
    }
    els.modalTask.close();
    closeDrawer();
    renderAll();
  };
}

function openTemaForm(existing = null, defaultEstado = "Pendiente") {
  const isEdit = Boolean(existing);
  const draft = existing || {
    id: nextTemaId(),
    nombre: "", programa: "", solicitante: "",
    prioridad: "Media", responsable: state.config.currentUser,
    estado: defaultEstado, expediente: "", gde: "",
    fechaInicio: fmtDate(new Date()), fechaLimite: fmtDate(new Date()),
    descripcion: "", privado: false,
    hitos: [], comentarios: [], documentos: [],
    historial: [{ event: "Tema creado", at: fmtDate(new Date()), by: activeUserName() }],
    ultimaActualizacion: fmtDate(new Date())
  };
  renderTaskFormShell(draft, isEdit);
  els.modalTask.showModal();
}

// =========================================================
// Hito edit modal (separate, small dialog — dialog#modalForm)
// =========================================================
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
      <label>Inicio<input type="date" name="fechaInicio" value="${existing?.fechaInicio || fmtDate(new Date())}" /></label>
      <label>Vencimiento
        <span class="fecha-with-badge">
          <input type="date" name="fechaLimite" id="hitoFechaLimiteInput" value="${existing?.fechaLimite || ""}" required />
          ${diasRestantesBadge(existing?.fechaLimite || "", "hitoDiasBadge")}
        </span>
      </label>
    </div>
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
  wireDiasBadge(document.getElementById("hitoFechaLimiteInput"), document.getElementById("hitoDiasBadge"));

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

  els.dynamicForm.onsubmit = (e) => {
    e.preventDefault();
    const resp = getSelectedResp(els.dynamicForm);
    if (!resp) { showToast("Selecciona al menos un responsable"); return; }
    const data = Object.fromEntries(new FormData(els.dynamicForm).entries());
    data.responsable = resp;
    const hiddenExp = document.getElementById("hito-gdeNumeroHidden");
    data.expediente = ownExpChk.checked ? (hiddenExp?.value.trim() || "") : "";
    delete data.numero;
    if (isEdit) {
      Object.assign(existing, data);
      tema.historial.push({ event: `Hito ${existing.id} editado`, at: fmtDate(new Date()), by: activeUserName() });
    } else {
      const newHito = { id: `H-${tema.id}-${tema.hitos.length + 1}`, ...data };
      tema.hitos.push(newHito);
      tema.historial.push({ event: "Hito agregado", at: fmtDate(new Date()), by: activeUserName() });
    }
    tema.ultimaActualizacion = fmtDate(new Date());
    els.modalForm.close();
    renderAll();
    if (opts.onSaved) opts.onSaved(); else openTemaDrawer(tema.id, "hitos");
  };
  els.modalForm.showModal();
}

function deleteHito(tema, hitoId, opts = {}) {
  if (!confirm("Eliminar hito?")) return;
  tema.hitos = tema.hitos.filter((h) => h.id !== hitoId);
  tema.historial.push({ event: `Hito ${hitoId} eliminado`, at: fmtDate(new Date()), by: activeUserName() });
  tema.ultimaActualizacion = fmtDate(new Date());
  renderAll();
  if (opts.onSaved) opts.onSaved(); else openTemaDrawer(tema.id, "hitos");
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
  els.dynamicForm.onsubmit = (e) => {
    e.preventDefault();
    const numero = document.getElementById("gdeNumeroHidden")?.value.trim();
    if (!numero) { showToast("Completa el número de expediente"); return; }
    const resp = getSelectedResp(els.dynamicForm);
    if (!resp) { showToast("Selecciona al menos un responsable"); return; }
    const data = Object.fromEntries(new FormData(els.dynamicForm).entries());
    data.numero = numero;
    data.responsable = resp;
    data.ultimaActualizacion = fmtDate(new Date());
    if (isEdit) {
      const oldNumero = existing.numero;
      Object.assign(existing, data);
      if (numero !== oldNumero) {
        state.temas.forEach((t) => { if (t.expediente === oldNumero) t.expediente = numero; });
      }
    } else {
      state.expedientes.push({ ...data, documentos: [], historial: [{ event: "Apertura expediente", at: data.ultimaActualizacion }] });
    }
    els.modalForm.close();
    renderAll();
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
      ${isEdit ? `<button class="ghost" type="button" id="deleteRespBtn" style="color:#dc2626">Eliminar</button><span style="flex:1"></span>` : ""}
      <button class="primary" value="submit">Guardar</button>
      <button class="ghost" value="cancel" type="button" onclick="document.getElementById('modalForm').close()">Cancelar</button>
    </div>
  `;
  if (isEdit) {
    const delBtn = els.dynamicForm.querySelector("#deleteRespBtn");
    if (delBtn) {
      delBtn.addEventListener("click", () => {
        if (!confirm(`Eliminar a ${existing.nombre}?`)) return;
        const fullNameDel = [existing.nombre, existing.apellido].filter(Boolean).join(" ");
        state.temas.forEach((t) => {
          if (t.responsable === fullNameDel) t.responsable = "";
          t.hitos.forEach((h) => { if (h.responsable === fullNameDel) h.responsable = ""; });
        });
        state.expedientes.forEach((e) => { if (e.responsable === fullNameDel) e.responsable = ""; });
        state.responsables = state.responsables.filter((r) => r.id !== existing.id);
        saveState(); els.modalForm.close(); renderAll();
      });
    }
  }
  els.dynamicForm.onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(els.dynamicForm).entries());
    if (isEdit) Object.assign(existing, data);
    else state.responsables.push({ id: nextRespId(), ...data });
    saveState(); els.modalForm.close(); renderResponsables();
  };
  els.modalForm.showModal();
}

function openUsuarioForm() {
  els.dynamicForm.innerHTML = `
    <h3>Agregar usuario</h3>
    <label>Nombre<input name="nombre" required /></label>
    <label>Email<input type="email" name="email" required /></label>
    <label>Contraseña<input type="password" name="password" required minlength="4" /></label>
    <label>Rol<select name="rol">${["Admin","Editor","Viewer"].map((r) => `<option>${r}</option>`).join("")}</select></label>
    <div class="btn-group">
      <button class="primary" value="submit">Guardar</button>
      <button class="ghost" value="cancel" type="button" onclick="document.getElementById('modalForm').close()">Cancelar</button>
    </div>
  `;
  els.dynamicForm.onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(els.dynamicForm).entries());
    const nombre = data.nombre.trim();
    const email = data.email.trim().toLowerCase();
    if (state.usuarios.find((u) => u.email.toLowerCase() === email)) {
      showToast("Ya existe un usuario con ese email"); return;
    }
    state.usuarios.push({
      id: nextUsuarioId(),
      nombre,
      email,
      passwordHash: simpleHash(data.password),
      rol: data.rol,
      activo: true,
      aprobado: true,
      fechaRegistro: fmtDate(new Date()),
      ultimoAcceso: ""
    });
    saveState(); els.modalForm.close(); renderUsuarios();
    showToast(`${nombre} agregado`);
  };
  els.modalForm.showModal();
}

// =========================================================
// Exports
// =========================================================
function exportCsv() {
  const temas = getFilteredTemas();
  const header = ["id","nombre","expediente","responsable","prioridad","programa","fechaInicio","fechaLimite","estado"];
  const rows = temas.map((t) => header.map((h) => csv(String(t[h] || ""))).join(","));
  download("reporte_temas.csv", [header.join(","), ...rows].join("\n"), "text/csv;charset=utf-8;");
}

function exportExcel() {
  const temas = getFilteredTemas();
  const tsv = ["ID\tTema\tEstado\tResponsable\tPrograma\tVto", ...temas.map((t) => `${t.id}\t${t.nombre}\t${t.estado}\t${t.responsable}\t${t.programa || ""}\t${t.fechaLimite}`)].join("\n");
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
            <th>ID</th><th>Tema</th><th>Programa</th><th>Responsable</th><th>Estado</th><th>Vencimiento</th>
          </tr>
        </thead>
        <tbody>
          ${temas.map((t) => `
          <tr>
            <td>${t.id}</td>
            <td>${escHtml(t.nombre)}</td>
            <td>${escHtml(t.programa || "-")}</td>
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

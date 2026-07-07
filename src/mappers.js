// Conversion entre filas de la base (snake_case) y el shape que espera la UI
// (camelCase). Mantener este archivo alineado con supabase/migrations/001.

export function toDateStr(v) {
  if (!v) return "";
  const s = String(v);
  return s.includes("T") ? s.slice(0, 10) : s;
}

// nulls para columnas date/text a partir de strings vacios de los formularios.
const orNull = (v) => (v === "" || v === undefined ? null : v);

// ---------------- temas ----------------
export function temaFromRow(r) {
  return {
    id: r.id,
    codigo: r.codigo || r.id,
    nombre: r.nombre || "",
    programa: r.programa || "",
    solicitante: r.solicitante || "",
    prioridad: r.prioridad || "Media",
    responsable: r.responsable_text || "",
    estado: r.estado || "Pendiente",
    expediente: r.expediente_numero || "",
    gde: r.gde_url || "",
    fechaInicio: toDateStr(r.fecha_inicio),
    fechaLimite: toDateStr(r.fecha_limite),
    fechaCierre: toDateStr(r.fecha_cierre),
    ultimaActualizacion: toDateStr(r.ultima_actualizacion),
    descripcion: r.descripcion || "",
    privado: !!r.privado,
    creadoPor: r.creado_por || null,
    cerradoPor: r.cerrado_por || "",
    orden: r.orden,
    // colecciones anidadas (las llena dataApi.fetchInitialState)
    hitos: [],
    comentarios: [],
    documentos: [],
    historial: []
  };
}

export function temaToRow(ui) {
  return {
    nombre: ui.nombre,
    programa: orNull(ui.programa),
    solicitante: orNull(ui.solicitante),
    prioridad: ui.prioridad || "Media",
    responsable_text: orNull(ui.responsable),
    estado: ui.estado || "Pendiente",
    expediente_numero: orNull(ui.expediente),
    gde_url: orNull(ui.gde),
    fecha_inicio: orNull(ui.fechaInicio),
    fecha_limite: orNull(ui.fechaLimite),
    fecha_cierre: orNull(ui.fechaCierre),
    ultima_actualizacion: orNull(ui.ultimaActualizacion),
    descripcion: orNull(ui.descripcion),
    privado: !!ui.privado,
    cerrado_por: orNull(ui.cerradoPor),
    orden: ui.orden ?? null
  };
}

// ---------------- hitos ----------------
export function hitoFromRow(r) {
  return {
    id: r.id,
    nombre: r.nombre || "",
    responsable: r.responsable_text || "",
    estado: r.estado || "Pendiente",
    fechaInicio: toDateStr(r.fecha_inicio),
    fechaLimite: toDateStr(r.fecha_limite),
    expediente: r.expediente_numero || "",
    descripcion: r.descripcion || ""
  };
}

export function hitoToRow(ui) {
  return {
    nombre: ui.nombre,
    responsable_text: orNull(ui.responsable),
    estado: ui.estado || "Pendiente",
    fecha_inicio: orNull(ui.fechaInicio),
    fecha_limite: orNull(ui.fechaLimite),
    expediente_numero: orNull(ui.expediente),
    descripcion: orNull(ui.descripcion)
  };
}

// ---------------- expedientes ----------------
export function expedienteFromRow(r) {
  return {
    numero: r.numero,
    gde: r.gde_url || "",
    temaAsociado: r.tema_asociado || "",
    fechaInicio: toDateStr(r.fecha_inicio),
    fechaLimite: toDateStr(r.fecha_limite),
    ultimaActualizacion: toDateStr(r.ultima_actualizacion),
    responsable: r.responsable_text || "",
    estado: r.estado || "Activo",
    documentos: [],
    historial: []
  };
}

export function expedienteToRow(ui) {
  return {
    gde_url: orNull(ui.gde),
    tema_asociado: orNull(ui.temaAsociado),
    fecha_inicio: orNull(ui.fechaInicio),
    fecha_limite: orNull(ui.fechaLimite),
    ultima_actualizacion: orNull(ui.ultimaActualizacion),
    responsable_text: orNull(ui.responsable),
    estado: ui.estado || "Activo"
  };
}

// ---------------- responsables ----------------
export function responsableFromRow(r) {
  return {
    id: r.id,
    nombre: r.nombre || "",
    apellido: r.apellido || "",
    email: r.email || "",
    dependencia: r.dependencia || "",
    cargo: r.cargo || "",
    usuarioGDE: r.usuario_gde || ""
  };
}

export function responsableToRow(ui) {
  return {
    nombre: ui.nombre,
    apellido: orNull(ui.apellido),
    email: orNull(ui.email),
    dependencia: orNull(ui.dependencia),
    cargo: orNull(ui.cargo),
    usuario_gde: orNull(ui.usuarioGDE)
  };
}

// ---------------- profiles / usuarios ----------------
export function profileToUsuario(r) {
  return {
    id: r.id,
    nombre: r.nombre || "",
    email: r.email || "",
    rol: r.rol || "Viewer",
    activo: !!r.activo,
    aprobado: !!r.aprobado,
    ultimoAcceso: toDateStr(r.ultimo_acceso),
    fechaRegistro: toDateStr(r.created_at)
  };
}

// ---------------- comentarios / historial ----------------
export function comentarioFromRow(r) {
  return { id: r.id, by: r.autor_nombre || "", text: r.texto || "", at: toDateStr(r.created_at) };
}

export function activityFromRow(r) {
  return { event: r.event || "", at: toDateStr(r.created_at), by: r.actor_nombre || "sistema" };
}

// ---------------- documentos ----------------
export function documentoFromRow(r) {
  return {
    id: r.id,
    nombre: r.nombre || "",
    tipo: r.tipo || "",
    storagePath: r.storage_path || "",
    relacionadoTipo: r.relacionado_tipo || "",
    temaId: r.tema_id || null,
    hitoId: r.hito_id || null,
    expedienteNumero: r.expediente_numero || null,
    fecha: toDateStr(r.created_at),
    uploadedBy: r.uploaded_by || null
  };
}

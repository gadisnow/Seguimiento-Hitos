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
    solicitante: r.solicitante || "",
    etiquetas: r.etiquetas || [],
    prioridad: r.prioridad || "Media",
    responsable: r.responsable_text || "",
    estado: r.estado || "Pendiente",
    expediente: r.expediente_numero || "",
    gde: r.gde_url || "",
    provincia: r.provincia || "",
    municipio: r.municipio || "",
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
    solicitante: orNull(ui.solicitante),
    etiquetas: ui.etiquetas || [],
    prioridad: ui.prioridad || "Media",
    responsable_text: orNull(ui.responsable),
    estado: ui.estado || "Pendiente",
    expediente_numero: orNull(ui.expediente),
    gde_url: orNull(ui.gde),
    provincia: orNull(ui.provincia),
    municipio: orNull(ui.municipio),
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
// fechaInicio/fechaLimite quedan calculadas por el motor de dependencias
// (ver calcularCascadaHitos en app.js) a partir de predecesorId/tipoVinculo/
// modoFecha/desfasajeDias/fechaManual/duracionPropia — se siguen guardando
// en las mismas columnas de siempre, solo cambia quien las escribe.
export function hitoFromRow(r) {
  return {
    id: r.id,
    nombre: r.nombre || "",
    responsable: r.responsable_text || "",
    estado: r.estado || "Pendiente",
    fechaInicio: toDateStr(r.fecha_inicio),
    fechaLimite: toDateStr(r.fecha_limite),
    fechaCierre: toDateStr(r.fecha_cierre),
    expediente: r.expediente_numero || "",
    descripcion: r.descripcion || "",
    predecesorId: r.predecesor_id || null,
    tipoVinculo: r.tipo_vinculo || null,
    modoFecha: r.modo_fecha || "fecha",
    desfasajeDias: r.desfasaje_dias === null || r.desfasaje_dias === undefined ? null : Number(r.desfasaje_dias),
    fechaManual: toDateStr(r.fecha_manual),
    duracionPropia: Number.isFinite(Number(r.duracion_propia)) ? Number(r.duracion_propia) : 4,
    orden: r.orden
  };
}

export function hitoToRow(ui) {
  return {
    nombre: ui.nombre,
    responsable_text: orNull(ui.responsable),
    estado: ui.estado || "Pendiente",
    fecha_inicio: orNull(ui.fechaInicio),
    fecha_limite: orNull(ui.fechaLimite),
    fecha_cierre: orNull(ui.fechaCierre),
    expediente_numero: orNull(ui.expediente),
    descripcion: orNull(ui.descripcion),
    predecesor_id: orNull(ui.predecesorId),
    tipo_vinculo: orNull(ui.tipoVinculo),
    modo_fecha: ui.modoFecha || "fecha",
    desfasaje_dias: ui.desfasajeDias === "" || ui.desfasajeDias === undefined || ui.desfasajeDias === null ? null : Number(ui.desfasajeDias),
    fecha_manual: orNull(ui.fechaManual),
    duracion_propia: Number.isFinite(Number(ui.duracionPropia)) ? Number(ui.duracionPropia) : 4
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
    ultimoAcceso: r.ultimo_acceso || "",
    fechaRegistro: toDateStr(r.created_at)
  };
}

// ---------------- comentarios / historial ----------------
export function comentarioFromRow(r) {
  return { id: r.id, by: r.autor_nombre || "", text: r.texto || "", at: toDateStr(r.created_at) };
}

export function activityFromRow(r) {
  return { event: r.event || "", at: toDateStr(r.created_at), createdAt: r.created_at || null, by: r.actor_nombre || "sistema" };
}

// ---------------- etiquetas (catalogo) ----------------
export function etiquetaFromRow(r) {
  return { id: r.id, nombre: r.nombre || "", color: r.color || "", orden: r.orden };
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

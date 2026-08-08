// Capa de datos. Toda lectura/escritura de datos principales pasa por aqui.
// La fuente de verdad es Supabase; la UI mantiene una copia en memoria para
// renderizar. RLS aplica los permisos del lado servidor.
import { supabase } from "./supabaseClient.js";
import { currentUserId, currentUserName } from "./authApi.js";
import * as M from "./mappers.js";
import DOMPurify from "dompurify";

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function must({ error }) {
  if (error) throw error;
}

// Pizarra actualmente cargada. Fase 1 no tiene selector todavia: se resuelve
// a la primera pizarra visible por RLS en fetchInitialState(). Fase 2 la
// hara explicita via un selector de pizarras.
let currentPizarraId = null;
export function getCurrentPizarraId() { return currentPizarraId; }

// =====================================================================
// Carga inicial: arma el shape de estado que consume la UI actual.
// Si no se pasa pizarraId explicito (selector de pizarras, fase 2), se
// resuelve a la primera pizarra visible por RLS (comportamiento fase 1).
// =====================================================================
export async function fetchInitialState(pizarraId = null) {
  let pizarraRow = null;
  if (pizarraId) {
    const pizR = await supabase.from("pizarras").select("*").eq("id", pizarraId).maybeSingle();
    must(pizR);
    pizarraRow = pizR.data || null;
  } else {
    const pizR = await supabase.from("pizarras").select("*").order("created_at", { ascending: true }).limit(1);
    must(pizR);
    pizarraRow = (pizR.data || [])[0] || null;
  }
  currentPizarraId = pizarraRow ? pizarraRow.id : null;
  const pizarra = pizarraRow ? M.pizarraFromRow(pizarraRow) : null;

  const colR = await supabase.from("columnas").select("*").eq("pizarra_id", currentPizarraId).order("orden", { ascending: true });
  must(colR);
  const columnas = (colR.data || []).map(M.columnaFromRow);
  const columnaById = Object.fromEntries(columnas.map((c) => [c.id, c]));

  const [temasR, hitosR, expR, respR, comR, actR, docR, profR, etqR] = await Promise.all([
    supabase.from("temas").select("*").eq("pizarra_id", currentPizarraId).order("orden", { ascending: true, nullsFirst: false }).order("id"),
    supabase.from("hitos").select("*").order("orden", { ascending: true, nullsFirst: false }).order("id"),
    supabase.from("expedientes").select("*").eq("pizarra_id", currentPizarraId).order("numero"),
    supabase.from("responsables").select("*").eq("pizarra_id", currentPizarraId).order("nombre"),
    supabase.from("comentarios").select("*").order("created_at", { ascending: true }),
    supabase.from("activity_log").select("*").order("created_at", { ascending: true }),
    supabase.from("documentos").select("*").order("created_at", { ascending: true }),
    supabase.from("profiles").select("*").order("created_at", { ascending: true }),
    supabase.from("etiquetas").select("*").eq("pizarra_id", currentPizarraId).order("orden", { ascending: true, nullsFirst: false }).order("nombre")
  ]);
  for (const r of [temasR, hitosR, expR, respR, comR, actR, docR, profR, etqR]) must(r);

  const temas = (temasR.data || []).map((r) => M.temaFromRow(r, columnaById));
  const temaById = Object.fromEntries(temas.map((t) => [t.id, t]));

  (hitosR.data || []).forEach((h) => {
    const t = temaById[h.tema_id];
    if (t) t.hitos.push(M.hitoFromRow(h));
  });
  (comR.data || []).forEach((c) => {
    const t = temaById[c.tema_id];
    if (t) t.comentarios.push(M.comentarioFromRow(c));
  });
  (actR.data || []).forEach((a) => {
    const t = temaById[a.tema_id];
    if (t) t.historial.push(M.activityFromRow(a));
  });

  const expedientes = (expR.data || []).map(M.expedienteFromRow);
  const expByNum = Object.fromEntries(expedientes.map((e) => [e.numero, e]));

  const documentos = (docR.data || []).map(M.documentoFromRow);
  documentos.forEach((d) => {
    if (d.temaId && temaById[d.temaId]) temaById[d.temaId].documentos.push(d);
    if (d.expedienteNumero && expByNum[d.expedienteNumero]) expByNum[d.expedienteNumero].documentos.push(d);
  });

  const responsables = (respR.data || []).map(M.responsableFromRow);
  const usuarios = (profR.data || []).map(M.profileToUsuario);
  const etiquetas = (etqR.data || []).map(M.etiquetaFromRow);

  return { temas, expedientes, responsables, documentos, usuarios, etiquetas, columnas, pizarraId: currentPizarraId, pizarra };
}

// =====================================================================
// Historial (activity_log)
// =====================================================================
export async function logActivity(temaId, event, opts = {}) {
  must(await supabase.from("activity_log").insert({
    tema_id: temaId,
    hito_id: opts.hitoId || null,
    event,
    user_id: currentUserId(),
    actor_nombre: currentUserName()
  }));
}

// =====================================================================
// Temas
// =====================================================================
export async function createTema(ui) {
  const row = { id: ui.id, codigo: ui.id, ...M.temaToRow(ui), pizarra_id: currentPizarraId, creado_por: currentUserId() };
  must(await supabase.from("temas").insert(row));
}

export async function updateTema(id, ui) {
  must(await supabase.from("temas").update(M.temaToRow(ui)).eq("id", id));
}

export async function deleteTema(id) {
  must(await supabase.from("temas").delete().eq("id", id));
}

export async function updateTemaColumna(id, columnaId, extra = {}) {
  must(await supabase.from("temas")
    .update({ columna_id: columnaId, ultima_actualizacion: today(), ...extra })
    .eq("id", id));
}

export async function setTemaFechaLimite(id, fecha) {
  must(await supabase.from("temas")
    .update({ fecha_limite: fecha, ultima_actualizacion: today() })
    .eq("id", id));
}

// Reasigna 'orden' segun el orden recibido (ids de una columna del Kanban).
export async function reorderTemas(orderedIds) {
  await Promise.all(orderedIds.map((id, i) =>
    supabase.from("temas").update({ orden: i }).eq("id", id)
  ));
}

// =====================================================================
// Hitos
// =====================================================================
export async function createHito(temaId, ui) {
  const row = { id: ui.id, codigo: ui.id, tema_id: temaId, ...M.hitoToRow(ui), orden: ui.orden ?? null };
  must(await supabase.from("hitos").insert(row));
}

export async function updateHito(id, ui) {
  must(await supabase.from("hitos").update(M.hitoToRow(ui)).eq("id", id));
}

export async function deleteHito(id) {
  must(await supabase.from("hitos").delete().eq("id", id));
}

// Reasigna 'orden' segun el orden recibido (arrastre manual en el tab Hitos).
export async function reorderHitos(orderedIds) {
  await Promise.all(orderedIds.map((id, i) =>
    supabase.from("hitos").update({ orden: i }).eq("id", id)
  ));
}

// =====================================================================
// Expedientes
// =====================================================================
export async function createExpediente(ui) {
  const row = { numero: ui.numero, ...M.expedienteToRow(ui), pizarra_id: currentPizarraId };
  must(await supabase.from("expedientes").insert(row));
}

export async function updateExpediente(oldNumero, ui) {
  const row = { numero: ui.numero, ...M.expedienteToRow(ui) };
  must(await supabase.from("expedientes").update(row).eq("numero", oldNumero));
  if (ui.numero && ui.numero !== oldNumero) {
    // temas.expediente_numero es texto libre: repuntar referencias visibles.
    await supabase.from("temas").update({ expediente_numero: ui.numero }).eq("expediente_numero", oldNumero);
  }
}

export async function deleteExpediente(numero) {
  must(await supabase.from("expedientes").delete().eq("numero", numero));
}

// =====================================================================
// Responsables
// =====================================================================
export async function createResponsable(ui) {
  const { data, error } = await supabase
    .from("responsables")
    .insert({ ...M.responsableToRow(ui), pizarra_id: currentPizarraId })
    .select()
    .single();
  if (error) throw error;
  return M.responsableFromRow(data);
}

export async function updateResponsable(id, ui) {
  must(await supabase.from("responsables").update(M.responsableToRow(ui)).eq("id", id));
}

export async function deleteResponsable(id, fullName) {
  // Limpia referencias de texto exactas (igual que la app original).
  if (fullName) {
    await Promise.all([
      supabase.from("temas").update({ responsable_text: "" }).eq("responsable_text", fullName),
      supabase.from("hitos").update({ responsable_text: "" }).eq("responsable_text", fullName),
      supabase.from("expedientes").update({ responsable_text: "" }).eq("responsable_text", fullName)
    ]);
  }
  must(await supabase.from("responsables").delete().eq("id", id));
}

// =====================================================================
// Comentarios
// =====================================================================
// texto llega como HTML de Quill; se sanitiza aca (no en el render) para
// que quede sanitizado en el origen sin importar desde donde se lea despues.
// Devuelve la fila creada (con id) para que la UI pueda pintarla de una
// sin esperar a un refetch completo, y para poder editarla despues.
export async function createComentario(temaId, texto, { hitoId = null, menciones = [] } = {}) {
  const { data, error } = await supabase.from("comentarios").insert({
    tema_id: temaId,
    hito_id: hitoId,
    menciones,
    user_id: currentUserId(),
    autor_nombre: currentUserName(),
    texto: DOMPurify.sanitize(texto)
  }).select().single();
  if (error) throw error;
  return M.comentarioFromRow(data);
}

// El autor edita su propio comentario (o un Admin, ver puedeEditarComentario
// en app.js) — solo se toca texto, nunca autor/fecha/menciones originales.
export async function updateComentario(id, texto) {
  must(await supabase.from("comentarios").update({ texto: DOMPurify.sanitize(texto) }).eq("id", id));
}

// =====================================================================
// Usuarios (profiles) - operaciones de administrador (protegidas por RLS)
// =====================================================================
export async function approveProfile(id, rol) {
  must(await supabase.from("profiles").update({ aprobado: true, rol }).eq("id", id));
}

export async function updateProfileRole(id, rol) {
  must(await supabase.from("profiles").update({ rol }).eq("id", id));
}

export async function deactivateProfile(id) {
  must(await supabase.from("profiles").update({ activo: false }).eq("id", id));
}

export async function deleteProfile(id) {
  must(await supabase.from("profiles").delete().eq("id", id));
}

// =====================================================================
// Documentos (Storage + metadata)
// =====================================================================
const BUCKET = "documentos";

function sanitizeName(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadDocumento(file, { relacionadoTipo, temaId = null, hitoId = null, expedienteNumero = null }) {
  const scope = temaId || hitoId || expedienteNumero || "general";
  const path = `${relacionadoTipo}/${scope}/${Date.now()}_${sanitizeName(file.name)}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });
  if (upErr) throw upErr;

  const meta = {
    nombre: file.name,
    tipo: (file.name.split(".").pop() || "").toUpperCase(),
    storage_path: path,
    relacionado_tipo: relacionadoTipo,
    tema_id: temaId,
    hito_id: hitoId,
    expediente_numero: expedienteNumero,
    uploaded_by: currentUserId()
  };
  const { data, error } = await supabase.from("documentos").insert(meta).select().single();
  if (error) {
    // Rollback del archivo si la metadata falla.
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return M.documentoFromRow(data);
}

export async function getDocumentoUrl(storagePath) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocumento(doc) {
  if (doc.storagePath) await supabase.storage.from(BUCKET).remove([doc.storagePath]);
  must(await supabase.from("documentos").delete().eq("id", doc.id));
}

// =====================================================================
// Etiquetas (catalogo central, estilo Trello)
// =====================================================================
export async function createEtiqueta(ui) {
  const { data, error } = await supabase
    .from("etiquetas")
    .insert({ nombre: ui.nombre, color: ui.color, orden: ui.orden ?? null, pizarra_id: currentPizarraId })
    .select()
    .single();
  if (error) throw error;
  return M.etiquetaFromRow(data);
}

export async function updateEtiqueta(id, ui) {
  must(await supabase.from("etiquetas").update({ nombre: ui.nombre, color: ui.color }).eq("id", id));
}

export async function deleteEtiqueta(id) {
  must(await supabase.from("etiquetas").delete().eq("id", id));
}

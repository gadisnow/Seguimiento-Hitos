// Capa de datos para pizarras (tableros) y sus columnas. Dominio separado
// de dataApi.js (que sigue manejando temas/hitos/comentarios/etc.) porque
// pizarras/columnas/colaboradores son un dominio propio, igual que
// authApi.js ya vive aparte de dataApi.js.
import { supabase } from "./supabaseClient.js";
import { currentUserId } from "./authApi.js";
import * as M from "./mappers.js";

function must({ error }) {
  if (error) throw error;
}

// Columnas por defecto de toda pizarra nueva (ver supabase/migrations/011
// y 016 para el remapeo de colores a la paleta original restaurada).
const COLUMNAS_DEFAULT = [
  { nombre: "Pendiente", esInicial: true, esFinal: false, color: "red" },
  { nombre: "En curso", esInicial: false, esFinal: false, color: "blue" },
  { nombre: "En revision", esInicial: false, esFinal: false, color: "violet" },
  { nombre: "Bloqueado", esInicial: false, esFinal: false, color: "amber" },
  { nombre: "Cerrado", esInicial: false, esFinal: true, color: "green" }
];

// =====================================================================
// Pizarras
// =====================================================================
export async function listMyPizarras() {
  const { data, error } = await supabase.from("pizarras").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(M.pizarraFromRow);
}

export async function createPizarra({ nombre, tipo = "personal" }) {
  const { data, error } = await supabase
    .from("pizarras")
    .insert({ nombre, tipo, creador_id: currentUserId() })
    .select()
    .single();
  if (error) throw error;
  const pizarra = M.pizarraFromRow(data);

  for (let i = 0; i < COLUMNAS_DEFAULT.length; i++) {
    const c = COLUMNAS_DEFAULT[i];
    must(await supabase.from("columnas").insert({
      pizarra_id: pizarra.id,
      nombre: c.nombre,
      es_inicial: c.esInicial,
      es_final: c.esFinal,
      color: c.color,
      orden: i
    }));
  }
  return pizarra;
}

export async function renamePizarra(id, nombre) {
  must(await supabase.from("pizarras").update({ nombre }).eq("id", id));
}

// Creador + colaboradores aceptados de la pizarra (id/nombre/email) — usado
// para armar la lista de candidatos a @mencionar en comentarios.
export async function getBoardMembers(pizarraId) {
  const { data, error } = await supabase.rpc("get_board_members", { p_pizarra_id: pizarraId });
  if (error) throw error;
  return data || [];
}

// Busca un perfil aprobado/activo por email para invitar como colaborador
// -- el cliente no puede leer profiles por email directo (RLS), asi que se
// resuelve via RPC (ver supabase/migrations/020_invite_collaborator.sql).
// null significa "sin cuenta activa con ese email" (puede no existir,
// estar pendiente de aprobacion, o desactivada -- no se distingue a
// proposito, ver openInvitarColaboradorModal en app.js).
export async function findCollaboratorCandidate(email) {
  const { data, error } = await supabase.rpc("find_collaborator_candidate", { p_email: email });
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

// Agrega (o actualiza el permiso de) un colaborador ya existente en la
// plataforma. estado 'aceptada' de una, sin paso de confirmacion de la
// otra persona (decision de producto). Protegido por la policy pc_insert
// (solo el creador de la pizarra puede invitar).
export async function addColaborador(pizarraId, usuarioId, permiso = "edit") {
  must(await supabase.from("pizarra_colaboradores").upsert({
    pizarra_id: pizarraId,
    usuario_id: usuarioId,
    permiso,
    estado: "aceptada",
    invitado_por: currentUserId()
  }, { onConflict: "pizarra_id,usuario_id" }));
}

// =====================================================================
// Columnas
// =====================================================================
export async function updateColumnaAncho(id, anchoPx) {
  must(await supabase.from("columnas").update({ ancho_px: anchoPx }).eq("id", id));
}

// nombre y color son independientes entre si: pasar solo el que cambia
// para no pisar el otro (ver bug fase 2: renombrar no debe borrar color).
export async function updateColumna(id, { nombre, color } = {}) {
  const patch = {};
  if (nombre !== undefined) patch.nombre = nombre;
  if (color !== undefined) patch.color = color;
  if (Object.keys(patch).length === 0) return;
  must(await supabase.from("columnas").update(patch).eq("id", id));
}

export async function deleteColumna(id) {
  must(await supabase.from("columnas").delete().eq("id", id));
}

// Inserta una columna intermedia nueva (justo antes de la final) via RPC:
// necesita correrse atomicamente para no chocar con la unicidad de orden.
export async function addColumnaIntermedia(pizarraId, nombre, color = "warm-gray") {
  const { data, error } = await supabase.rpc("add_columna_pizarra", {
    p_pizarra_id: pizarraId,
    p_nombre: nombre,
    p_color: color
  });
  if (error) throw error;
  return data; // uuid de la columna nueva
}

// Reordena todas las columnas de la pizarra segun el arreglo de ids recibido.
export async function reorderColumnas(pizarraId, orderedIds) {
  const { error } = await supabase.rpc("reorder_columnas", {
    p_pizarra_id: pizarraId,
    p_ordered_ids: orderedIds
  });
  if (error) throw error;
}

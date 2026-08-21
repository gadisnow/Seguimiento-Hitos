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
// "Archivados" tambien va esFinal:true -- mismo criterio de bloqueo
// (solo lectura, columna fija sin reordenar) que "Cerrado", ver
// supabase/migrations/032_columna_archivados.sql para el detalle de por
// que reusar esFinal en vez de un flag nuevo.
const COLUMNAS_DEFAULT = [
  { nombre: "Pendiente", esInicial: true, esFinal: false, color: "red" },
  { nombre: "En curso", esInicial: false, esFinal: false, color: "blue" },
  { nombre: "En revision", esInicial: false, esFinal: false, color: "violet" },
  { nombre: "Bloqueado", esInicial: false, esFinal: false, color: "amber" },
  { nombre: "Cerrado", esInicial: false, esFinal: true, color: "green" },
  { nombre: "Archivados", esInicial: false, esFinal: true, color: "warm-gray" }
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

// Elimina una pizarra completa (dueno, nunca la protegida) via RPC -- ver
// delete_pizarra en supabase/migrations/022_pizarras_delete.sql. Salir de
// una pizarra ajena (colaborador) no necesita funcion propia: es
// removeColaborador(pizarraId, currentUserId()) mas abajo.
export async function deletePizarra(pizarraId) {
  const { error } = await supabase.rpc("delete_pizarra", { p_pizarra_id: pizarraId });
  if (error) throw error;
}

// Mi propio permiso en cada pizarra donde soy colaborador (no dueno) --
// para la vista "Mis pizarras": distingue "administro" de "colaboro" y
// muestra con que rol. Permitido por la policy pc_select (usuario_id =
// auth.uid()), sin necesitar RPC.
export async function listMisColaboraciones() {
  const { data, error } = await supabase
    .from("pizarra_colaboradores")
    .select("pizarra_id, permiso")
    .eq("usuario_id", currentUserId());
  if (error) throw error;
  return data || [];
}

// Creador + colaboradores aceptados de la pizarra (id/nombre/email) — usado
// para armar la lista de candidatos a @mencionar en comentarios, y para
// resolver el nombre del dueno en la vista "Mis pizarras" cuando no soy yo.
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
// proposito, ver openColaboradoresModal en app.js).
export async function findCollaboratorCandidate(email) {
  const { data, error } = await supabase.rpc("find_collaborator_candidate", { p_email: email });
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

// Agrega (o actualiza el permiso de) un colaborador ya existente en la
// plataforma. estado 'aceptada' de una, sin paso de confirmacion de la
// otra persona (decision de producto). Protegido por la policy pc_insert
// (solo el creador de la pizarra puede invitar). Tambien sirve para
// volver a agregar a alguien que se habia quitado (upsert).
export async function addColaborador(pizarraId, usuarioId, permiso = "edit") {
  must(await supabase.from("pizarra_colaboradores").upsert({
    pizarra_id: pizarraId,
    usuario_id: usuarioId,
    permiso,
    estado: "aceptada",
    invitado_por: currentUserId()
  }, { onConflict: "pizarra_id,usuario_id" }));
}

// Panel "Colaboradores": dueno + todos los colaboradores de la pizarra con
// su rol (ver list_board_collaborators, supabase/migrations/021). Solo el
// creador de la pizarra puede llamarla (gateado tambien en la funcion SQL).
export async function listColaboradores(pizarraId) {
  const { data, error } = await supabase.rpc("list_board_collaborators", { p_pizarra_id: pizarraId });
  if (error) throw error;
  return (data || []).map(M.colaboradorFromRow);
}

// Cambia el rol (editor/visualizador) de un colaborador ya sumado a la
// pizarra. Protegido por la policy pc_update_creator (solo el dueno).
export async function updateColaboradorPermiso(pizarraId, usuarioId, permiso) {
  must(await supabase.from("pizarra_colaboradores").update({ permiso })
    .eq("pizarra_id", pizarraId).eq("usuario_id", usuarioId));
}

// Quita a un colaborador de la pizarra (puede volver a sumarse despues via
// addColaborador). Protegido por la policy pc_delete (dueno o el propio
// colaborador).
export async function removeColaborador(pizarraId, usuarioId) {
  must(await supabase.from("pizarra_colaboradores").delete()
    .eq("pizarra_id", pizarraId).eq("usuario_id", usuarioId));
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

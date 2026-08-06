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

// Columnas por defecto de toda pizarra nueva (ver supabase/migrations/011).
const COLUMNAS_DEFAULT = [
  { nombre: "Pendiente", esInicial: true, esFinal: false, color: "cool-neutral" },
  { nombre: "En curso", esInicial: false, esFinal: false, color: "orange" },
  { nombre: "En revision", esInicial: false, esFinal: false, color: "orange-light" },
  { nombre: "Bloqueado", esInicial: false, esFinal: false, color: "rust" },
  { nombre: "Cerrado", esInicial: false, esFinal: true, color: "ink-dark" }
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
export async function addColumnaIntermedia(pizarraId, nombre, color = "neutral") {
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

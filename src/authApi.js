// Capa de autenticacion sobre Supabase Auth. Mantiene en memoria el profile
// del usuario actual (rol/aprobado/activo) para que la UI consulte permisos.
import { supabase } from "./supabaseClient.js";
import { profileToUsuario } from "./mappers.js";

let _profile = null;   // usuario (shape UI) del profile actual
let _authEmail = null; // email real de auth.users (para reautenticacion)

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(cb) {
  return supabase.auth.onAuthStateChange(cb);
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password
  });
  if (error) throw error;
  return data;
}

export async function register(nombre, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { nombre: nombre.trim() } }
  });
  if (error) throw error;
  return data;
}

export async function logout() {
  _profile = null;
  _authEmail = null;
  await supabase.auth.signOut();
}

// Carga (o recarga) el profile del usuario logueado. Devuelve null si no hay
// sesion o si aun no existe profile (caso raro de trigger no ejecutado).
export async function loadProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    _profile = null;
    _authEmail = null;
    return null;
  }
  _authEmail = user.email;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  _profile = data ? profileToUsuario(data) : null;
  return _profile;
}

export function currentProfile() { return _profile; }
export function currentUserId() { return _profile ? _profile.id : null; }
export function currentUserName() { return _profile ? _profile.nombre : "sistema"; }
export function currentAuthEmail() { return _authEmail; }

// Verifica la contrasena actual reautenticando y luego la actualiza.
export async function changePassword(actual, nueva) {
  if (_authEmail) {
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: _authEmail,
      password: actual
    });
    if (reauthErr) {
      const e = new Error("Contrasena actual incorrecta");
      e.code = "bad_current_password";
      throw e;
    }
  }
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) throw error;
}

// Actualiza datos propios (nombre/email de display en profiles).
export async function updateOwnProfile({ nombre, email }) {
  if (!_profile) return;
  const patch = {};
  if (nombre !== undefined) patch.nombre = nombre;
  if (email !== undefined) patch.email = email;
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", _profile.id)
    .select()
    .single();
  if (error) throw error;
  _profile = profileToUsuario(data);
  return _profile;
}

export async function touchLastAccess() {
  if (!_profile) return;
  await supabase
    .from("profiles")
    .update({ ultimo_acceso: new Date().toISOString() })
    .eq("id", _profile.id);
}

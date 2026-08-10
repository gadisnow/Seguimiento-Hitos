// Capa de autenticacion sobre Supabase Auth. Mantiene en memoria el profile
// del usuario actual (rol/aprobado/activo) para que la UI consulte permisos.
import { supabase } from "./supabaseClient.js";
import { profileToUsuario } from "./mappers.js";

let _profile = null;   // usuario (shape UI) del profile actual
let _authEmail = null; // email real de auth.users (para reautenticacion)
let _passwordRecovery = false; // ver isPasswordRecovery() mas abajo

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(cb) {
  return supabase.auth.onAuthStateChange(cb);
}

// Suscripcion registrada a nivel de modulo (se ejecuta apenas se importa
// este archivo, antes de que app.js llegue a llamar boot()) para no perderse
// el evento PASSWORD_RECOVERY que supabase-js dispara al detectar el link
// del email de recuperacion en la URL. Si boot() recien chequeara esto
// adentro de una funcion llamada mas tarde, existe la ventana de que el
// evento ya haya disparado y quedara sin escucha.
supabase.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") _passwordRecovery = true;
});

// true si la sesion activa viene de clickear el link de "olvide mi
// contrasena" (no de un login normal) — boot() la usa para mostrar la
// pantalla de "elegir nueva contrasena" en vez de entrar a la app.
export function isPasswordRecovery() { return _passwordRecovery; }
export function clearPasswordRecovery() { _passwordRecovery = false; }

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

// Invita a alguien que todavia no tiene cuenta: Supabase crea el
// auth.users (shouldCreateUser) y le manda un magic link por email. Al
// clickearlo entra con sesion, pero igual queda bloqueado en "pendiente de
// aprobacion" -- el trigger handle_new_user crea el profile igual que en un
// registro con contrasena (ver boot() en app.js), solo cambia la puerta de
// entrada. Mismas limitaciones de mailer que requestPasswordReset (ver TODO
// mas abajo): rate-limit bajo, plantilla en ingles sin poder personalizarla.
export async function inviteNewUserByEmail(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true, emailRedirectTo: window.location.origin }
  });
  if (error) throw error;
}

export async function logout() {
  _profile = null;
  _authEmail = null;
  await supabase.auth.signOut();
}

// Recuperacion de contrasena: envia un link de un solo uso por email (el
// mail vuelve a la app con una sesion de recuperacion — ver
// isPasswordRecovery mas arriba). Nunca revela si el email existe o no — el
// llamador debe mostrar siempre el mismo mensaje generico de exito (ver
// renderForgotPassword en app.js).
//
// TODO: el pedido original era un codigo de 6 digitos escrito a mano (no un
// link), pero Supabase no deja personalizar la plantilla del email de
// recuperacion sin plan pago o SMTP propio (probado: PATCH a
// /config/auth devuelve 400 "Email template modification is not available
// for free tier projects using the default email provider"). En cuanto haya
// SMTP configurado, reemplazar este flujo por uno basado en
// supabase.auth.verifyOtp({ email, token, type: "recovery" }) con un input
// de 6 digitos, igual que register()/login() de mas abajo.
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin
  });
  if (error) throw error;
}

// Aplica la nueva contrasena sobre la sesion de recuperacion activa (ver
// isPasswordRecovery) y cierra sesion para forzar un login limpio con las
// credenciales nuevas.
export async function completePasswordReset(nueva) {
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) throw error;
  _passwordRecovery = false;
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

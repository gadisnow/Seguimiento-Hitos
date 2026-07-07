# Auditoría de hardening — Seguimiento-Hitos

Estado al 2026-07-05. `[x]` = ya implementado · `[ ]` = recomendado (pendiente).

## Ya implementado

- [x] **RLS activo** en las 8 tablas; permisos Viewer/Editor/Admin validados end-to-end
      (viewer no inserta, editor no borra, admin todo).
- [x] **service_role fuera del frontend**; el bundle solo lleva la anon key.
- [x] **`.env` en `.gitignore`** (+ `node_modules`, `dist`, `.vercel`). Sin secretos en el repo.
- [x] **Storage privado** (`documentos`), acceso por signed URL con políticas por rol.
- [x] **Sin passwords propios** (los gestiona Supabase Auth); se eliminó `simpleHash`.
- [x] **Validación de datos** con CHECKs (estados, roles, prioridad) y `null` en vacíos.
- [x] Protección de columnas privilegiadas en `profiles` (solo Admin cambia rol/aprobado/activo).

## Recomendado (prioridad alta)

- [ ] **CRÍTICO — emails de bootstrap reclamables.** El trigger `handle_new_user` da
      Admin automático a `adminssoys@gmail.com` y `llanes.ariel.enrique@gmail.com`. Con
      *email autoconfirm* ON y sin verificación de propiedad, **cualquiera que registre un
      email de bootstrap aún no usado obtiene Admin**. `adminssoys@…` ya está registrado
      (no reclamable), pero `llanes.ariel.enrique@…` **no** → hoy es reclamable.
      **Fix (elegir uno):**
      1. Reclamar ese email creándolo ya (Admin API), o
      2. quitarlo de `admin_emails` en `002_functions_triggers.sql` y reaplicar la función, o
      3. activar confirmación de email (ver abajo).
- [ ] **Rotar los tokens** Supabase (`sbp_...`) y Vercel (`vcp_...`): se compartieron por
      chat. Revocar y regenerar; actualizar `.env` y los Secrets. (Ver `docs/SERVICIOS.md`.)
- [ ] **Cambiar la contraseña del admin** de bootstrap tras el primer ingreso (está en `.env`).
- [ ] **Eliminar el usuario de prueba** `prueba@ejemplo.com` antes de producción real
      (o dejarlo solo mientras se prueba).

## Recomendado (prioridad media)

- [ ] **Confirmación de email en producción.** Hoy `mailer_autoconfirm=ON` (registro sin
      verificar). Para uso real, considerar activar confirmación (requiere SMTP propio para
      que los mails lleguen: Auth → SMTP Settings) y/o **restringir el registro a un dominio**.
- [ ] **Protección de contraseñas filtradas** (HaveIBeenPwned): Auth → Policies → activar.
- [ ] **Longitud mínima de contraseña** ≥ 8 (hoy 6, default de Supabase).
- [ ] **CAPTCHA en registro** (Turnstile/hCaptcha) para evitar altas automatizadas
      (aunque queden pendientes de aprobación).
- [ ] **MFA para admins** (Supabase Auth soporta TOTP).

## Recomendado (prioridad baja / operación)

- [ ] **Backups**: verificar retención; evaluar Point-in-Time Recovery (plan Pro).
- [ ] **Rama protegida** en GitHub (`main`) + PRs con el check de `ci.yml`.
- [ ] **Monitoreo**: revisar logs de Supabase (Auth/DB) y de Vercel periódicamente.
- [ ] Revisar `temas.privado`: hoy un tema privado solo lo ve su creador y los Admin
      (definido en RLS). Confirmar que es la política deseada.

## Cómo cerrar el punto crítico (opción 2, sin tocar Auth)

Editar `admin_emails` en `supabase/migrations/002_functions_triggers.sql` dejando solo el
email ya registrado, y reaplicar solo la función `handle_new_user` vía Management API o
`supabase db push`. A partir de ahí, los nuevos admins se asignan **solo** aprobando desde
la app (que ya funciona con RLS).

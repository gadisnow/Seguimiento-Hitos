---
name: configurar-deploy
description: Pone en marcha Seguimiento-Hitos en Supabase + Vercel de forma automática. Le pegás a Claude el token de Supabase (sbp_) y el de Vercel (vcp_) y Claude hace todo por API - crea el proyecto Supabase, aplica migraciones, deja el admin, crea el proyecto Vercel, carga env vars y despliega. Usar al recibir el proyecto (handoff/zip), configurar backend/hosting por primera vez, o migrar a infraestructura propia. Palabras clave: configurar deploy, token vercel, token supabase, automatico, migraciones, primer admin, poner en marcha, onboarding, setup, push.
---

# Puesta en marcha automática (Supabase + Vercel)

Le pasás a Claude 2 tokens y hace casi todo por API. Supone que los cambios del zip ya
están **extraídos en la raíz del repo** y que estás dentro del repo de GitHub clonado.

## Lo único que hacés vos a mano (no se puede automatizar)
1. **Crear las cuentas** de Supabase y Vercel (con el email del GitHub) y **generar 1 token
   de cada una** — hace falta cuenta para emitir un token.
2. Para **deploy en cada push**: **1 clic** para instalar la *Vercel GitHub App* (o, si
   tenés `gh` autenticado, Claude lo automatiza vía GitHub Actions).

## Generar los tokens (una vez)
- **Supabase:** https://supabase.com (Continue with GitHub) → Account → **Access Tokens** →
  *Generate new token* → `sbp_...`.
- **Vercel:** https://vercel.com (Continue with GitHub) → Account → Settings → **Tokens** →
  *Create* → `vcp_...`.

## Cómo lanzarlo
**Pegale a Claude en el chat** (Claude los guarda en `.env`, NO los commitea ni los imprime):
- Token de Supabase `sbp_...` y token de Vercel `vcp_...`.
- Tu **email de admin** y una **contraseña** para esa cuenta.
- La **región** Supabase preferida (ej. `sa-east-1` = São Paulo) y el **repo** (owner/nombre).

Y decí: **"ejecutá el skill configurar-deploy con estos datos"**.

---

## Runbook que ejecuta Claude (Bearer = el token que corresponda)

### Supabase (Management API)
1. Orgs: `GET https://api.supabase.com/v1/organizations` → elegir `organization_id`.
2. Crear proyecto: `POST https://api.supabase.com/v1/projects`
   `{ organization_id, name:"seguimiento-hitos", region, db_pass:<generar y guardar> }`.
   Luego poll `GET /v1/projects/{ref}` hasta `status = ACTIVE_HEALTHY` (tarda unos minutos).
3. Keys: `GET /v1/projects/{ref}/api-keys` → guardar `anon` y `service_role`.
4. Migraciones: en `supabase/migrations/002_functions_triggers.sql` reemplazar el array
   `admin_emails` por **el email de admin** provisto. Después, por cada archivo `001..005`
   (en orden): `POST /v1/projects/{ref}/database/query` con `{ "query": "<contenido .sql>" }`.
5. Auth: `PATCH /v1/projects/{ref}/config/auth` `{ mailer_autoconfirm:true, disable_signup:false }`.
6. Primer admin: `POST https://{ref}.supabase.co/auth/v1/admin/users`
   (headers `apikey` y `Authorization: Bearer` = **service_role**)
   `{ email:<admin>, password:<provista>, email_confirm:true, user_metadata:{ nombre:"Admin" } }`.
   El trigger lo deja Admin aprobado. Verificar en tabla `profiles`.

### Vercel (API)
7. Crear proyecto: `POST https://api.vercel.com/v11/projects`
   `{ name:"seguimiento-hitos", framework:"vite" }` → guardar `id` y `accountId`.
8. Env vars: `POST https://api.vercel.com/v10/projects/{id}/env?upsert=true`
   para `VITE_SUPABASE_URL` (`https://{ref}.supabase.co`) y `VITE_SUPABASE_ANON_KEY`
   (target: production, preview, development).
9. Desplegar: subir los archivos del repo (cada uno con su SHA1 a `POST /v2/files` con header
   `x-vercel-digest`) y `POST /v13/deployments?forceNew=1`
   `{ name, project:"seguimiento-hitos", target:"production", files:[...],
      projectSettings:{ framework:"vite" } }`. Poll hasta `readyState = READY`.
   Vercel buildea remoto y devuelve la URL de producción.

### Deploy automático en cada push (elegir uno)
- **(a) 1 clic (recomendado):** Vercel → el proyecto → **Settings → Git → Connect** el repo
  (instala la GitHub App). Desde ahí, cada push = deploy.
- **(b) sin clic, con `gh`:** si hay GitHub CLI autenticado, Claude corre
  `gh secret set VERCEL_TOKEN`, `VERCEL_ORG_ID` (= `accountId`), `VERCEL_PROJECT_ID` (= `id`)
  y queda activo `.github/workflows/deploy.yml` (push = deploy vía Actions).
- **(c) nada:** Claude redespliega por API cuando haya cambios (no es "on push").

### Subir el código a GitHub
Para (a)/(b) y para tener historial: `git add . && git commit -m "setup" && git push origin main`.
(El `.env` no se sube: está en `.gitignore`.)

---

## Verificar
Abrí la URL de Vercel → login con el admin → deben verse los 12 temas del seed, el Kanban, etc.
Probá crear un tema y subir un documento (va a tu Storage).

## Seguridad
- Los tokens van a `.env` (gitignored). **Nunca** commitearlos ni exponer el `service_role`
  en el frontend. Rotalos si dejaron de ser necesarios.
- Cambiá contraseñas temporales y borrá usuarios de prueba antes de producción.
- Revisá `docs/HARDENING.md`.

## Si algo falla
- **Crear proyecto Supabase tarda:** es normal (minutos); seguí poleando `status`.
- **"Faltan VITE_SUPABASE_URL/ANON_KEY":** faltan/mal las env vars en Vercel → corregí y Redeploy.
- **Login OK sin datos:** tu perfil no quedó Admin/aprobado → revisá el email en `admin_emails`
  o aprobalo desde la tabla `profiles`.
- **No deploya al pushear:** el repo no está conectado en Vercel (Settings → Git) o no fue a `main`.

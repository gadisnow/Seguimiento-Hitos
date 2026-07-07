# Servicios — cómo trabajar con cada uno

## Supabase (Auth + Postgres + RLS + Storage)

- Proyecto: `sfvthcctgsyvjbsrzvug` · Dashboard: https://supabase.com/dashboard/project/sfvthcctgsyvjbsrzvug
- URL API: `https://sfvthcctgsyvjbsrzvug.supabase.co`

### Claves y tokens
- **anon key** → frontend (`VITE_SUPABASE_ANON_KEY`). Pública por diseño; segura porque
  todo pasa por RLS.
- **service_role** → NUNCA en el frontend ni en el repo. Solo para tareas admin puntuales
  (crear/borrar usuarios) desde scripts o serverless.
- **SUPABASE_ACCESS_TOKEN** (`sbp_...`) → Management API (crear proyectos, correr SQL,
  configurar Auth). Control total de la cuenta.

### Tareas comunes
- **Migraciones:** archivos en `supabase/migrations/`. Aplicar con
  `supabase db push` (CLI) o Management API:
  `POST https://api.supabase.com/v1/projects/<ref>/database/query` con
  `{"query":"<SQL>"}` y header `Authorization: Bearer $SUPABASE_ACCESS_TOKEN`.
- **Usuarios/roles:** se administran desde la app (pantalla Usuarios) o SQL. Crear un
  usuario a mano: Admin API `POST /auth/v1/admin/users` con service_role.
- **Auth config:** email autoconfirm está ON (registro inmediato; los datos igual quedan
  tras aprobación por RLS). Cambiar en Dashboard → Authentication → Providers/Email.
- **Storage:** bucket privado `documentos`. Acceso por signed URL desde el cliente
  autenticado (`createSignedUrl`). Políticas en `004_storage.sql`.

### Backups
- Supabase hace backups diarios (según plan). Para datos críticos, considerar
  **Point-in-Time Recovery** (plan Pro) y/o export periódico (`pg_dump` vía connection
  string, o Dashboard → Database → Backups).

## Vercel (hosting + build)

- Proyecto: `seguimiento-hitos` (`prj_kPDiYFv8KG4O5JIn1DmwH0XcLadI`) · Team `ssoys`
- Producción: https://seguimiento-hitos.vercel.app
- Framework Vite · Build `npm run build` · Output `dist`.

### Env vars (build-time, Vite)
Configuradas en Project → Settings → Environment Variables (Production/Preview/Development):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Si cambian, hay que **redeploy**.

### Deploy
- **Recomendado:** conectar el repo GitHub (Settings → Git) → auto-deploy on push.
- Manual/CI: `.github/workflows/deploy.yml` (Vercel CLI + secrets) o subida directa por API.
- Los deployments con URL generada (`...-hash-ssoys.vercel.app`) pueden tener
  *Deployment Protection*; el dominio de producción `seguimiento-hitos.vercel.app` es público.

## Cloudflare (opcional — hoy NO se usa)

El stack actual (SPA estática en Vercel + Supabase) **no requiere Cloudflare**. Vercel ya
da CDN global, TLS y mitigación DDoS básica. Recomendación:

**Sí conviene agregarlo si:**
- Querés un **dominio propio institucional** (ej. `temas.tudominio.gob.ar`) con DNS y
  proxy propios, y/o **WAF**/reglas de firewall/rate-limiting más finas que las de Vercel.
- Querés caché/analytics de Cloudflare o Turnstile (anti-bot) en el registro.

**Cómo, si se decide (DNS delante de Vercel):**
1. Agregar el dominio en Cloudflare (nameservers).
2. En Vercel → Project → Domains, agregar el dominio; Vercel indica el `CNAME`/`A`.
3. En Cloudflare, crear el registro apuntando a Vercel (proxied), SSL "Full (strict)".
4. Opcional: WAF managed rules + rate limiting en `/auth`.

**No recomiendo** mover el hosting a Cloudflare Pages/Workers ahora: implicaría rehacer
build/deploy sin beneficio claro para esta app.

## Rotación de secretos (pendiente)

Los tokens Supabase/Vercel se compartieron por chat, así que conviene **rotarlos**:
- Supabase: Dashboard → Account → Access Tokens (revocar el `sbp_...` y crear uno nuevo);
  y Project → Settings → API para rotar keys si hiciera falta.
- Vercel: Account → Settings → Tokens (revocar el `vcp_...` y crear uno nuevo).
- Actualizar `.env` local y los GitHub/Vercel Secrets con los nuevos valores.

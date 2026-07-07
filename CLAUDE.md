# CLAUDE.md — Seguimiento-Hitos

Guía para trabajar en este proyecto desde Claude Code. Leer antes de empezar.

## ⚠️ Regla de tokens (antes de empezar)

Este proyecto necesita credenciales que **NO** están en el repo (viven en `.env`,
que está en `.gitignore`). **Antes de tocar Supabase/Vercel**, verificá que exista
`.env` en la raíz con estas variables y, si falta alguna, **pedísela al usuario**:

```
VITE_SUPABASE_URL=            # frontend (se publica en el bundle)
VITE_SUPABASE_ANON_KEY=       # frontend (pública por diseño; la seguridad está en las RLS)
SUPABASE_PROJECT_REF=         # admin/CI
SUPABASE_ACCESS_TOKEN=        # admin/CI (sbp_...)  — control total de la cuenta Supabase
VERCEL_TOKEN=                 # admin/CI (vcp_...)  — control total de la cuenta Vercel
```

Reglas duras:
- **Nunca** commitear tokens ni el `.env`. **Nunca** poner el `service_role` ni el
  `SUPABASE_ACCESS_TOKEN` en el bundle del frontend (solo `VITE_*` llega al cliente).
- En CI, los secretos van en **GitHub Actions Secrets** / **Vercel env vars**, no en el repo.
- Si te piden "commitear los tokens", explicá el riesgo (quedan en el historial de git
  para siempre) y ofrecé la alternativa de secretos gestionados.

> Hay un hook `SessionStart` sugerido en `docs/claude-settings.json` que avisa si falta
> `.env`. Aplicarlo desde `/hooks` o copiándolo a `.claude/settings.json`.

## Qué es

SPA (HTML/CSS/JS vanilla, build con **Vite**) para seguimiento de temas, hitos y
expedientes de la SSOyS. Backend **Supabase** (Auth + Postgres + RLS + Storage),
hosting **Vercel**. El frontend usa solo la anon key; la seguridad vive en las RLS.

- Producción: https://seguimiento-hitos.vercel.app
- Supabase ref: `sfvthcctgsyvjbsrzvug` · Vercel project: `seguimiento-hitos`

## Arquitectura

```
index.html ──> /src/main.js ──> ../app.js  (render + eventos; ~2600 líneas)
                                   │
                                   ├─ src/supabaseClient.js  (createClient con anon key)
                                   ├─ src/authApi.js         (login/registro/logout/perfil)
                                   ├─ src/dataApi.js         (CRUD + Storage; toda I/O pasa aquí)
                                   └─ src/mappers.js         (fila DB snake_case <-> UI camelCase)
```

- `app.js` mantiene un `state` en memoria **como cache de render**; la fuente de verdad
  es Supabase. Tras cada mutación se llama `dataApi.*` y luego `reloadState()` (refetch)
  o se actualiza el `state` local. `withBusy(fn)` envuelve mutaciones y muestra toasts.
- `localStorage` **solo** para preferencias visuales (tema claro/oscuro). Nunca datos.
- IDs de texto visibles como PK: temas `T-001`, hitos `H-001-1`.

## Comandos (requiere Node 18+)

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # -> dist/
npm run preview
```

> En este equipo Windows **no hay Node instalado**: el build/deploy se hace remoto en
> Vercel, y las migraciones vía Management API REST (ver README_DEPLOY.md).

## Base de datos

Migraciones en `supabase/migrations/001..005` (schema, funciones/trigger, RLS, storage,
seed). Ya aplicadas. Para reaplicar: `supabase db push` o Management API
(`POST /v1/projects/<ref>/database/query`). Detalle en `README_DEPLOY.md`.

Roles (RLS, no solo frontend): **Viewer** lee · **Editor** crea/edita (no borra) ·
**Admin** todo + administra usuarios. Trigger `handle_new_user` aprueba como Admin a los
emails de bootstrap; el resto queda pendiente hasta aprobación de un admin.

## Actualizar datos

**Se hace desde la app** (no hay scripts de import): un Editor/Admin crea o edita temas,
hitos, expedientes, responsables, comentarios y documentos desde la interfaz, y persiste
en Supabase. Un Admin aprueba usuarios y cambia roles desde **Usuarios**. Documentos: se
suben como archivo real a Storage (bucket privado `documentos`), con enlace por signed URL.

## Deploy / CI

- **Puesta en marcha en cuentas propias (Supabase + Vercel desde cero):** seguí el skill
  `/configurar-deploy` (`.claude/skills/configurar-deploy/SKILL.md`). Es la guía autoritativa
  para un handoff; el resto de los docs describen el despliegue de referencia original.
- **Recomendado:** conectar el repo Git a Vercel (Settings → Git). Cada push a `main`
  hace deploy de producción automáticamente; los PRs generan previews. No requiere
  tokens en el repo.
- Alternativa con control de build: workflow en `.github/workflows/deploy.yml`
  (usa `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` como **GitHub Secrets**).

## Convenciones

- Mantener el render existente; cambiar solo la fuente de datos. Toda I/O nueva va en
  `dataApi.js`, no en `app.js`.
- Estados válidos: `Pendiente`, `En curso`, `En revision`, `Bloqueado`, `Cerrado`.
- Fechas `YYYY-MM-DD`. Al escribir a la DB, strings vacíos → `null` (ver `mappers.js`).

## Cosas a NO hacer

- No reintroducir `localStorage` para datos ni `simpleHash`/passwords propios.
- No exponer `service_role` ni tokens de admin en el frontend.
- No confiar en permisos solo del navegador: validar siempre con RLS.



<!-- cloude-code-toolbox:mcp-skills-awareness-begin -->

### MCP & Skills awareness (Cloude Code ToolBox)

_Last synced: 2026-07-07T20:11:02.308Z._

- **Full report:** `.claude/cloude-code-toolbox-mcp-skills-awareness.md` in this workspace (auto-overwritten on each scan). Use it as ground truth for configured servers and skill folders.
- **MCP:** For **live tools** in Claude Code, enable the matching server via `/mcp`. Servers are configured in `~/.claude.json` (user) and `.mcp.json` (project).
- **When the user’s task matches a server** (e.g. Confluence work and a **Confluence** / **Atlassian** MCP is listed), **prefer that server id** and plan on tool use—not only file search.
- **Skills:** Folders below contain `SKILL.md`; attach or cite paths in chat when relevant.

#### Workspace MCP

- `d:\00-Proyectos Claude\Seguimiento-hitos-gadisnow\.mcp.json` _(workspace: Seguimiento-hitos-gadisnow)_ — _file missing_

_No active workspace servers in mcp.json._

#### User MCP

- `C:\Users\jorge\.claude.json` — _no servers defined_

_No active user-scoped servers in mcp.json._

#### Project skills

- **configurar-deploy** — `d:\00-Proyectos Claude\Seguimiento-hitos-gadisnow\.claude\skills\configurar-deploy` — Pone en marcha Seguimiento-Hitos en Supabase + Vercel de forma automática. Le pegás a Claude el token de Supabase (sbp_) y el de Vercel (vcp_) y Claude hace todo por API - crea el proyecto Supabase, aplica migraciones, d

#### User skills

_None found._

<!-- cloude-code-toolbox:mcp-skills-awareness-end -->

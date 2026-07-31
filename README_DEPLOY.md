# Seguimiento-Hitos — Deploy (Supabase + Vercel)

App SPA (HTML/CSS/JS vanilla, build con Vite) sobre **Supabase** (Auth + Postgres +
RLS + Storage) y **Vercel** (hosting + build). El frontend solo usa la **anon key**;
toda la seguridad vive en las políticas RLS del backend.

## Recursos ya provisionados

| Recurso | Valor |
|---|---|
| Supabase project ref | `sfvthcctgsyvjbsrzvug` |
| Supabase URL | `https://sfvthcctgsyvjbsrzvug.supabase.co` |
| Vercel project | `seguimiento-hitos` (`prj_kPDiYFv8KG4O5JIn1DmwH0XcLadI`) |
| Producción | https://seguimiento-hitos.vercel.app |
| Bucket Storage | `documentos` (privado) |
| Admin de bootstrap | `adminssoys@gmail.com` (ver `.env` → `ADMIN_PASSWORD`) |

> **Cambiá la contraseña del admin** después del primer ingreso
> (Configuración → Cambiar contraseña).

## Variables de entorno

Copiá `.env.example` a `.env` y completá:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → **únicas** que llegan al navegador
  (Vite solo publica variables con prefijo `VITE_`).
- `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `VERCEL_TOKEN` → solo para
  scripts/CI locales. **Nunca** se exponen al cliente ni se commitean (`.gitignore`).

En Vercel ya están cargadas `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
(Production/Preview/Development).

## Desarrollo local

Requiere Node 18+.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # genera dist/
npm run preview   # sirve dist/
```

## Base de datos (migraciones)

Las migraciones están en `supabase/migrations/` y **ya fueron aplicadas** al proyecto:

1. `001_initial_schema.sql` — tablas (profiles, responsables, temas, hitos,
   expedientes, comentarios, activity_log, documentos).
2. `002_functions_triggers.sql` — helpers de permisos (`is_approved_user`,
   `is_admin`, `can_edit`), trigger `handle_new_user` (crea profile al registrarse;
   emails de bootstrap → Admin aprobado), protección de columnas privilegiadas,
   `updated_at`.
3. `003_rls_policies.sql` — RLS en las 8 tablas.
4. `004_storage.sql` — bucket privado `documentos` + políticas de Storage.
5. `005_seed_data.sql` — datos semilla (12 temas, 28 hitos, 3 expedientes, 7
   responsables) derivados de `seedData`.
6. `006_etiquetas.sql` — columna `temas.etiquetas` (jsonb, copia embebida por tarjeta).
7. `007_etiquetas_registro.sql` — tabla `etiquetas` (catálogo central, editable desde
   el menú "⋯" del tablero); backfill desde las etiquetas ya usadas en temas.

### Reaplicar / aplicar en otro proyecto

Opción A — Supabase CLI:

```bash
supabase link --project-ref <REF>
supabase db push
```

Opción B — Management API (sin CLI), aplicando cada archivo en orden:

```bash
curl -X POST "https://api.supabase.com/v1/projects/<REF>/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"query\": \"<contenido del .sql>\"}"
```

### Primer admin (bootstrap)

El trigger `handle_new_user` marca como **Admin aprobado** a los emails listados en
`admin_emails` dentro de `002_functions_triggers.sql`
(`adminssoys@gmail.com`, `llanes.ariel.enrique@gmail.com`). Cualquiera de esos
emails que se registre queda admin automáticamente. El resto queda
`aprobado = false` hasta que un admin lo apruebe.

## Roles y permisos (RLS)

- **Viewer**: solo lectura (usuarios aprobados y activos).
- **Editor**: crea/edita temas, hitos, expedientes, responsables, comentarios y
  documentos. **No** elimina ni administra usuarios.
- **Admin**: todo + eliminar + aprobar/rechazar usuarios y cambiar roles.

Validado end-to-end: viewer no inserta (403), editor inserta pero su delete afecta
0 filas, admin ve todo.

## Deploy en Vercel

- Framework: **Vite** · Build: `npm run build` · Output: `dist`.
- Recomendado: conectar el repo Git a Vercel para deploys automáticos por push.
- Deploy manual (sin Git), subiendo archivos vía API: los fuentes se suben con su
  digest SHA1 y Vercel corre el build remoto (no hace falta Node local).

## Seguridad

- El frontend usa **solo** la anon key. La service_role key **no** está en el
  repo ni en el bundle.
- RLS activo en las 8 tablas; Storage privado con signed URLs.
- No se guardan contraseñas propias (las gestiona Supabase Auth).
- `.env` está en `.gitignore`; no hay secretos commiteados.

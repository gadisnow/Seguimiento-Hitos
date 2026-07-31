# Plan de implementacion: Supabase + Vercel

## 1. Estado actual del proyecto

El proyecto es una aplicacion web estatica compuesta principalmente por:

- `index.html`: estructura de pantallas y modales.
- `styles.css`: estilos completos de la interfaz.
- `app.js`: datos iniciales, login, permisos, renderizado, filtros, dashboard y operaciones CRUD en memoria/localStorage.
- `seguimiento de tareas.xlsx`: fuente/referencia de datos con hojas `Seguimiento temas`, `Copia modelo Claude` y `Leyenda`.

La aplicacion ya tiene una UI bastante completa:

- Login y solicitud de acceso.
- Dashboard con KPIs, graficos y alertas.
- Gestion de temas en Kanban, lista y calendario.
- Gestion de hitos dentro de cada tema.
- Expedientes.
- Responsables.
- Usuarios y roles.
- Reportes/exportaciones.
- Comentarios, historial y documentos como datos asociados.

El problema principal es que todo vive en frontend:

- Los datos semilla estan hardcodeados en `seedData`.
- La persistencia se hace con `localStorage` usando la clave `sgtemas_v4`.
- El login usa `simpleHash()` en navegador, sin seguridad real.
- Los roles `Admin`, `Editor`, `Viewer` tambien se controlan en frontend.
- Los documentos hoy son nombres de archivo, no archivos reales persistidos.

## 2. Objetivo

Convertir la app en una aplicacion funcional, multiusuario y persistente usando:

- Vercel para hosting del frontend.
- Supabase Auth para login y sesiones.
- Supabase Postgres para datos compartidos.
- Supabase Row Level Security para permisos.
- Supabase Storage para adjuntos.
- Vercel Environment Variables para configuracion.

No hace falta un servidor dedicado. La app puede ser una SPA en Vercel consumiendo Supabase directamente desde el navegador, con RLS bien configurado.

## 3. Arquitectura propuesta

```text
Usuario
  |
  v
Vercel
  - index.html
  - styles.css
  - app.js / modulos JS
  |
  | Supabase JS client
  v
Supabase
  - Auth
  - Postgres
  - Row Level Security
  - Storage
```

Para una primera version no es necesario usar API propia en Vercel. La seguridad debe quedar en Supabase mediante RLS.

Solo agregaria Vercel Serverless Functions si aparece alguno de estos casos:

- invitaciones gestionadas con service role;
- acciones administrativas que no conviene exponer al cliente;
- integraciones externas;
- procesamiento de archivos;
- envio de emails personalizados.

## 4. Decision tecnica recomendada

Mantener la app como frontend vanilla inicialmente.

No migrar de entrada a Next.js o React. La UI actual ya funciona y la migracion mas segura es reemplazar la capa de datos por un modulo `api.js` usando `@supabase/supabase-js`.

Estructura sugerida:

```text
/
  index.html
  styles.css
  app.js
  src/
    supabaseClient.js
    dataApi.js
    authApi.js
    mappers.js
  supabase/
    migrations/
      001_initial_schema.sql
      002_rls_policies.sql
      003_seed_data.sql
  package.json
  vercel.json
  .env.example
```

Si se usa Vite para build:

```text
src/
  main.js
  app/
  services/
```

Pero Vite no es obligatorio si se prefiere conservar la app estatica simple.

## 5. Modelo de datos propuesto

### `profiles`

Extiende `auth.users`.

Campos:

- `id uuid primary key references auth.users(id)`
- `nombre text`
- `email text`
- `rol text check (rol in ('Admin','Editor','Viewer'))`
- `activo boolean default true`
- `aprobado boolean default false`
- `dependencia text`
- `cargo text`
- `usuario_gde text`
- `ultimo_acceso timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

Uso:

- reemplaza `state.usuarios`;
- controla permisos reales;
- permite flujo de aprobacion.

### `responsables`

Campos:

- `id uuid primary key`
- `nombre text`
- `apellido text`
- `email text`
- `dependencia text`
- `cargo text`
- `usuario_gde text`
- `created_at timestamptz`
- `updated_at timestamptz`

Uso:

- reemplaza `state.responsables`;
- mantiene la gestion actual de responsables.

### `temas`

Campos:

- `id text primary key` o `uuid primary key`
- `codigo text unique` para valores tipo `T-001`
- `nombre text not null`
- `programa text`
- `solicitante text`
- `prioridad text check (prioridad in ('Alta','Media','Baja'))`
- `responsable_text text`
- `estado text check (estado in ('Pendiente','En curso','En revision','Bloqueado','Cerrado'))`
- `expediente_numero text`
- `gde_url text`
- `fecha_inicio date`
- `fecha_limite date`
- `fecha_cierre date`
- `ultima_actualizacion date`
- `descripcion text`
- `privado boolean default false`
- `creado_por uuid references profiles(id)`
- `cerrado_por uuid references profiles(id)`
- `orden integer`
- `created_at timestamptz`
- `updated_at timestamptz`

Uso:

- reemplaza `state.temas`;
- conserva `codigo` para no romper la UI actual.

### `hitos`

Campos:

- `id text primary key` o `uuid primary key`
- `codigo text unique` para valores tipo `H-001-1`
- `tema_id text references temas(id) on delete cascade`
- `nombre text not null`
- `responsable_text text`
- `estado text`
- `fecha_inicio date`
- `fecha_limite date`
- `expediente_numero text`
- `descripcion text`
- `orden integer`
- `created_at timestamptz`
- `updated_at timestamptz`

Uso:

- reemplaza `tema.hitos`.

### `expedientes`

Campos:

- `numero text primary key`
- `gde_url text`
- `tema_asociado text`
- `fecha_inicio date`
- `fecha_limite date`
- `ultima_actualizacion date`
- `responsable_text text`
- `estado text check (estado in ('Activo','En revision','Cerrado'))`
- `created_at timestamptz`
- `updated_at timestamptz`

Uso:

- reemplaza `state.expedientes`.

### `comentarios`

Campos:

- `id uuid primary key`
- `tema_id text references temas(id) on delete cascade`
- `user_id uuid references profiles(id)`
- `texto text not null`
- `created_at timestamptz`

Uso:

- reemplaza `tema.comentarios`.

### `activity_log`

Campos:

- `id uuid primary key`
- `tema_id text references temas(id) on delete cascade`
- `hito_id text null`
- `event text not null`
- `user_id uuid references profiles(id)`
- `actor_nombre text`
- `created_at timestamptz`

Uso:

- reemplaza `tema.historial`;
- permite auditoria real.

### `documentos`

Campos:

- `id uuid primary key`
- `nombre text`
- `tipo text`
- `storage_path text`
- `relacionado_tipo text check (relacionado_tipo in ('tema','hito','expediente'))`
- `tema_id text null references temas(id) on delete cascade`
- `hito_id text null references hitos(id) on delete cascade`
- `expediente_numero text null references expedientes(numero)`
- `uploaded_by uuid references profiles(id)`
- `created_at timestamptz`

Uso:

- reemplaza `state.documentos` y `tema.documentos`;
- los archivos reales van en Supabase Storage.

## 6. Seguridad y permisos

Roles actuales:

- `Admin`
- `Editor`
- `Viewer`

Reglas recomendadas:

- Todo usuario debe estar autenticado.
- Todo usuario debe tener `profiles.aprobado = true` y `profiles.activo = true` para ver datos.
- `Viewer`: solo lectura.
- `Editor`: crear y editar temas, hitos, expedientes, comentarios y documentos.
- `Admin`: todo lo anterior mas eliminar, aprobar usuarios y cambiar roles.

Implementar helpers SQL:

- `is_approved_user()`
- `current_role()`
- `is_admin()`
- `can_edit()`

Activar RLS en todas las tablas.

Politicas ejemplo:

- `select`: usuarios aprobados y activos.
- `insert/update`: `Admin` o `Editor`.
- `delete`: solo `Admin`.
- `profiles update`: el usuario puede actualizar su propio nombre; solo Admin puede cambiar `rol`, `aprobado` o `activo`.

## 7. Autenticacion

Reemplazar por completo:

- `simpleHash()`
- `state.sesion`
- `state.usuarios.passwordHash`
- login manual contra localStorage.

Usar Supabase Auth:

- `supabase.auth.signInWithPassword()`
- `supabase.auth.signUp()`
- `supabase.auth.signOut()`
- `supabase.auth.getSession()`
- `supabase.auth.onAuthStateChange()`

Flujo recomendado:

1. Usuario se registra con email/password.
2. Supabase crea `auth.users`.
3. Trigger crea registro en `profiles` con rol `Viewer`, `aprobado = false`.
4. Pantalla indica "pendiente de aprobacion".
5. Admin aprueba y asigna rol.
6. Usuario puede entrar y consultar datos.

Para uso institucional tambien se puede evaluar magic link o SSO mas adelante.

## 8. Migracion de datos

Fuentes actuales:

- `seedData` en `app.js`.
- `seguimiento de tareas.xlsx`, hoja `Seguimiento temas`.
- posibles datos locales de cada usuario en `localStorage`.

Plan:

1. Tomar `seedData` como primera semilla tecnica.
2. Usar el Excel como fuente de validacion/importacion historica.
3. Crear scripts de migracion:
   - `scripts/extract-seed.mjs`: extrae `seedData` o usa JSON intermedio.
   - `scripts/import-xlsx.mjs`: importa filas del Excel si se decide usarlo.
   - `supabase/migrations/003_seed_data.sql`: carga datos iniciales.
4. Normalizar estados:
   - `01 - Pendiente` -> `Pendiente`
   - `02 - En curso` -> `En curso`
   - `03 - En revision` -> `En revision`
   - `04 - Cerrado` -> `Cerrado`
   - `05 - Bloqueado` -> `Bloqueado`
5. Normalizar fechas a `YYYY-MM-DD`.
6. Mantener codigos visibles `T-001`, `H-001-1`.

## 9. Cambios en frontend

Crear una capa de datos para evitar que todo `app.js` hable directo con Supabase.

### `supabaseClient.js`

Responsable de inicializar cliente:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### `authApi.js`

Funciones:

- `getSession()`
- `login(email, password)`
- `register(nombre, email, password)`
- `logout()`
- `getCurrentProfile()`

### `dataApi.js`

Funciones:

- `fetchInitialState()`
- `listTemas()`
- `createTema(data)`
- `updateTema(id, data)`
- `deleteTema(id)`
- `updateTemaEstado(id, estado)`
- `reorderTemas(estado, orderedIds)`
- `listHitos(temaId)`
- `createHito(temaId, data)`
- `updateHito(id, data)`
- `deleteHito(id)`
- `listExpedientes()`
- `createExpediente(data)`
- `updateExpediente(numero, data)`
- `listResponsables()`
- `createResponsable(data)`
- `updateResponsable(id, data)`
- `listProfiles()`
- `approveProfile(id, rol)`
- `updateProfileRole(id, rol)`
- `deactivateProfile(id)`

### Adaptacion de `state`

Mantener un estado local en memoria para renderizar:

```js
let state = {
  temas: [],
  expedientes: [],
  documentos: [],
  responsables: [],
  usuarios: [],
  profile: null
};
```

Pero la fuente de verdad pasa a ser Supabase.

`saveState()` deja de escribir datos principales en `localStorage`.

`localStorage` puede quedar solo para:

- tema claro/oscuro;
- filtros locales;
- vista activa;
- preferencias visuales.

## 10. Deploy en Vercel

### Variables de entorno

En Vercel:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Si no se usa Vite y se mantiene JS estatico, hay dos opciones:

1. Generar `config.js` en build usando variables de Vercel.
2. Migrar a Vite para inyectar variables de entorno de forma estandar.

Recomendacion: agregar Vite para tener un build prolijo.

### Configuracion minima

`package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.0.0",
    "vite": "^7.0.0"
  },
  "devDependencies": {}
}
```

Vercel:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

## 11. Fases de implementacion

### Fase 0: Preparacion

- Crear repo Git si el proyecto no lo tiene.
- Agregar `.env.example`.
- Agregar `package.json`.
- Agregar Vite o definir estrategia estatica.
- Confirmar si la fuente de verdad inicial sera `seedData`, el Excel, o ambos.

Resultado:

- proyecto listo para desarrollo local y deploy en Vercel.

### Fase 1: Supabase base

- Crear proyecto Supabase.
- Crear migracion inicial.
- Crear tablas principales.
- Crear RLS.
- Crear bucket `documentos`.
- Crear trigger para `profiles`.
- Crear primer usuario Admin.

Resultado:

- base lista y segura.

### Fase 2: Auth real

- Reemplazar login frontend por Supabase Auth.
- Implementar registro.
- Implementar pendiente de aprobacion.
- Implementar logout.
- Cargar perfil y rol actual desde `profiles`.
- Eliminar dependencia de `passwordHash`.

Resultado:

- usuarios reales con sesion persistente segura.

### Fase 3: Lectura de datos

- Implementar `fetchInitialState()`.
- Cargar temas, hitos, expedientes, responsables, documentos y perfiles desde Supabase.
- Mapear datos de tablas al formato que espera la UI actual.
- Mantener renderizado existente.

Resultado:

- dashboard y pantallas leen datos compartidos.

### Fase 4: Escritura de datos

- Reemplazar mutaciones locales por llamadas Supabase:
  - crear/editar/eliminar tema;
  - mover Kanban;
  - cambiar fecha desde calendario;
  - crear/editar/eliminar hito;
  - crear/editar expediente;
  - crear/editar responsable;
  - comentarios;
  - historial.
- Despues de cada operacion, refrescar estado o aplicar actualizacion optimista.

Resultado:

- la app queda funcional multiusuario.

### Fase 5: Documentos

- Reemplazar `prompt("Nombre del documento")`.
- Agregar input real de archivo.
- Subir archivo a Supabase Storage.
- Crear registro en `documentos`.
- Mostrar link de descarga/visualizacion.
- Aplicar politicas de Storage.

Resultado:

- documentos persistentes y compartidos.

### Fase 6: Administracion de usuarios

- Reemplazar pantalla usuarios local por `profiles`.
- Permitir aprobar/rechazar usuarios.
- Cambiar roles.
- Desactivar usuarios.
- Proteger todo con RLS.

Resultado:

- administracion real de acceso.

### Fase 7: Reportes y exportaciones

- Mantener export CSV/Excel/PDF del lado cliente para datos visibles.
- Confirmar que solo exporte datos permitidos por RLS.
- Opcional: agregar filtros persistidos por usuario.

Resultado:

- reportes actuales siguen funcionando.

### Fase 8: Deploy

- Crear proyecto en Vercel.
- Configurar variables de entorno.
- Conectar GitHub.
- Deploy preview.
- Probar login, roles, CRUD y Storage.
- Deploy production.

Resultado:

- aplicacion online con datos persistentes.

## 12. Orden recomendado de trabajo

1. Crear `package.json`, Vite y estructura `src/`.
2. Crear Supabase project y migraciones.
3. Implementar Auth.
4. Implementar lectura desde Supabase.
5. Migrar temas/hitos/expedientes/responsables.
6. Reemplazar escrituras locales.
7. Implementar documentos con Storage.
8. Implementar roles/admin.
9. Deploy en Vercel.
10. QA con usuarios reales.

## 13. Riesgos y decisiones pendientes

### Fuente inicial de datos

Hay diferencias entre `seedData` y el Excel. Hay que decidir cual manda.

Recomendacion:

- usar `seedData` para migracion tecnica inicial;
- comparar contra el Excel antes de produccion;
- si el Excel es la fuente oficial, generar seed desde Excel.

### Responsables

Hoy los responsables pueden venir como texto con varios nombres separados por coma.

MVP:

- mantener `responsable_text`.

Version mejorada:

- crear tablas puente `tema_responsables` y `hito_responsables`.

### IDs

Hoy la UI usa codigos como `T-001` y `H-001-1`.

Recomendacion:

- usar UUID interno si se refactoriza fuerte;
- conservar `codigo` visible siempre.

Para migracion rapida:

- se puede usar `codigo` como primary key temporal.

### Privacidad

Existe `privado` y `creadoPor` en temas.

Hay que definir si un tema privado solo lo ve:

- su creador;
- su creador y admins;
- su creador, admins y responsables asignados.

### Realtime

Supabase Realtime puede actualizar Kanban/dashboard sin refrescar.

No es necesario para MVP. Agregar despues.

## 14. Criterios de aceptacion

La implementacion se considera completa cuando:

- Un usuario puede registrarse.
- Un admin puede aprobarlo y asignarle rol.
- Un usuario aprobado puede iniciar sesion.
- Los datos se cargan desde Supabase, no desde `seedData`.
- Crear/editar/eliminar temas persiste en Supabase.
- Crear/editar/eliminar hitos persiste en Supabase.
- Los movimientos de Kanban persisten.
- Los cambios de calendario persisten.
- Los comentarios e historial persisten.
- Los expedientes y responsables persisten.
- Los documentos se suben a Supabase Storage.
- Viewer no puede editar.
- Editor no puede eliminar ni administrar usuarios.
- Admin puede administrar usuarios.
- El deploy funciona en Vercel con variables de entorno.
- No quedan passwords, service role keys ni secretos en frontend o repo.

## 15. Entregables sugeridos

- Migraciones SQL en `supabase/migrations/`.
- Capa de Supabase client.
- Capa de Auth API.
- Capa de Data API.
- UI conectada a Supabase.
- Script de seed/importacion.
- `.env.example`.
- `README_DEPLOY.md` con pasos para Supabase y Vercel.
- Deploy production en Vercel.


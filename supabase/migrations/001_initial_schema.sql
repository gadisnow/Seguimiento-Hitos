-- =====================================================================
-- 001_initial_schema.sql
-- Esquema base de Seguimiento-Hitos.
-- Códigos visibles (T-001, H-001-1) se usan como PK de texto para
-- mantener compatibilidad directa con la UI actual.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles: extiende auth.users
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  nombre        text,
  email         text,
  rol           text not null default 'Viewer' check (rol in ('Admin','Editor','Viewer')),
  activo        boolean not null default true,
  aprobado      boolean not null default false,
  dependencia   text,
  cargo         text,
  usuario_gde   text,
  ultimo_acceso timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- responsables
-- ---------------------------------------------------------------------
create table if not exists public.responsables (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  apellido    text,
  email       text,
  dependencia text,
  cargo       text,
  usuario_gde text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- temas
-- ---------------------------------------------------------------------
create table if not exists public.temas (
  id                   text primary key,          -- 'T-001'
  codigo               text,                       -- visible, = id
  nombre               text not null,
  programa             text,
  solicitante          text,
  prioridad            text default 'Media' check (prioridad in ('Alta','Media','Baja')),
  responsable_text     text,
  estado               text not null default 'Pendiente'
                         check (estado in ('Pendiente','En curso','En revision','Bloqueado','Cerrado')),
  expediente_numero    text,
  gde_url              text,
  fecha_inicio         date,
  fecha_limite         date,
  fecha_cierre         date,
  ultima_actualizacion date,
  descripcion          text,
  privado              boolean not null default false,
  creado_por           uuid references public.profiles(id) on delete set null,
  cerrado_por          text,
  orden                integer,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_temas_estado on public.temas(estado);
create index if not exists idx_temas_orden  on public.temas(orden);

-- ---------------------------------------------------------------------
-- hitos
-- ---------------------------------------------------------------------
create table if not exists public.hitos (
  id                text primary key,              -- 'H-001-1'
  codigo            text,
  tema_id           text not null references public.temas(id) on delete cascade,
  nombre            text not null,
  responsable_text  text,
  estado            text default 'Pendiente'
                      check (estado in ('Pendiente','En curso','En revision','Bloqueado','Cerrado')),
  fecha_inicio      date,
  fecha_limite      date,
  expediente_numero text,
  descripcion       text,
  orden             integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_hitos_tema on public.hitos(tema_id);

-- ---------------------------------------------------------------------
-- expedientes
-- ---------------------------------------------------------------------
create table if not exists public.expedientes (
  numero               text primary key,
  gde_url              text,
  tema_asociado        text,
  fecha_inicio         date,
  fecha_limite         date,
  ultima_actualizacion date,
  responsable_text     text,
  estado               text default 'Activo' check (estado in ('Activo','En revision','Cerrado')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- comentarios
-- ---------------------------------------------------------------------
create table if not exists public.comentarios (
  id            uuid primary key default gen_random_uuid(),
  tema_id       text not null references public.temas(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete set null,
  autor_nombre  text,
  texto         text not null,
  created_at    timestamptz not null default now()
);
create index if not exists idx_comentarios_tema on public.comentarios(tema_id);

-- ---------------------------------------------------------------------
-- activity_log (historial)
-- ---------------------------------------------------------------------
create table if not exists public.activity_log (
  id            uuid primary key default gen_random_uuid(),
  tema_id       text references public.temas(id) on delete cascade,
  hito_id       text,
  event         text not null,
  user_id       uuid references public.profiles(id) on delete set null,
  actor_nombre  text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_activity_tema on public.activity_log(tema_id);

-- ---------------------------------------------------------------------
-- documentos (metadata; archivos reales en Storage bucket 'documentos')
-- ---------------------------------------------------------------------
create table if not exists public.documentos (
  id                uuid primary key default gen_random_uuid(),
  nombre            text,
  tipo              text,
  storage_path      text,
  relacionado_tipo  text check (relacionado_tipo in ('tema','hito','expediente')),
  tema_id           text references public.temas(id) on delete cascade,
  hito_id           text references public.hitos(id) on delete cascade,
  expediente_numero text references public.expedientes(numero) on delete set null,
  uploaded_by       uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists idx_documentos_tema on public.documentos(tema_id);
create index if not exists idx_documentos_exp  on public.documentos(expediente_numero);

-- ---------------------------------------------------------------------
-- 035_notas_grupos_y_tema.sql
-- Agrupar notas (tipo carpeta: una nota pertenece a UN grupo o ninguno)
-- y poder vincular opcionalmente una nota a un tema puntual.
-- ---------------------------------------------------------------------

create table if not exists public.notas_grupos (
  id          uuid primary key default gen_random_uuid(),
  pizarra_id  uuid not null references public.pizarras(id) on delete cascade,
  nombre      text not null,
  created_at  timestamptz not null default now()
);

alter table public.notas_grupos enable row level security;

create policy notas_grupos_select on public.notas_grupos
  for select using (can_view_board(pizarra_id));

create policy notas_grupos_insert on public.notas_grupos
  for insert with check (can_edit_board(pizarra_id));

-- Sin update: el alcance actual es crear/borrar grupos, no renombrarlos.
create policy notas_grupos_delete on public.notas_grupos
  for delete using (can_edit_board(pizarra_id));

create index if not exists notas_grupos_pizarra_idx on public.notas_grupos(pizarra_id, nombre);

-- Borrar un grupo no borra sus notas, solo las deja sin grupo (igual
-- criterio que documentos/expedientes: nunca se pierde contenido del
-- usuario por borrar una entidad "organizativa").
alter table public.notas add column if not exists grupo_id uuid references public.notas_grupos(id) on delete set null;

-- temas.id es text ('T-001'), no uuid -- ver 001_initial_schema.sql. Sin FK:
-- desde 019_board_scope_composite_keys.sql la PK de temas es compuesta
-- (pizarra_id, id), y una FK compuesta con "on delete set null" pondria en
-- null TODAS las columnas referenciadas -- incluido notas.pizarra_id, que
-- es not null y se usa para la RLS de esta misma tabla. Referencia blanda,
-- validada en la app (el <select> solo ofrece temas de la pizarra actual).
alter table public.notas add column if not exists tema_id text;

create index if not exists notas_grupo_idx on public.notas(grupo_id);
create index if not exists notas_tema_idx on public.notas(tema_id);

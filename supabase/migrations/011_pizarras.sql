-- =====================================================================
-- 011_pizarras.sql
-- Modelo de tableros (pizarras): multi-tenant boards. Migra la instancia
-- actual (single-board) para que sea la primera pizarra, con columnas de
-- kanban configurables por pizarra reemplazando el temas.estado fijo.
-- =====================================================================

create table public.pizarras (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  tipo       text not null default 'personal' check (tipo in ('personal','colaborativa')),
  creador_id uuid not null references auth.users(id) on delete cascade,
  accesorios jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_updated_at before update on public.pizarras
  for each row execute function public.set_updated_at();

create table public.pizarra_colaboradores (
  pizarra_id   uuid not null references public.pizarras(id) on delete cascade,
  usuario_id   uuid not null references auth.users(id) on delete cascade,
  permiso      text not null check (permiso in ('view','edit')),
  estado       text not null default 'pendiente' check (estado in ('pendiente','aceptada','rechazada')),
  invitado_por uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (pizarra_id, usuario_id)
);
create trigger trg_updated_at before update on public.pizarra_colaboradores
  for each row execute function public.set_updated_at();

create table public.columnas (
  id         uuid primary key default gen_random_uuid(),
  pizarra_id uuid not null references public.pizarras(id) on delete cascade,
  nombre     text not null,
  es_inicial boolean not null default false,
  es_final   boolean not null default false,
  color      text not null default 'neutral'
               check (color in ('cool-neutral','orange','orange-light','rust','ink-dark','neutral')),
  ancho_px   integer not null default 260 check (ancho_px between 220 and 800),
  orden      integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index columnas_pizarra_orden_uq on public.columnas(pizarra_id, orden);
create unique index columnas_pizarra_inicial_uq on public.columnas(pizarra_id) where es_inicial;
create unique index columnas_pizarra_final_uq   on public.columnas(pizarra_id) where es_final;
create trigger trg_updated_at before update on public.columnas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Scoping columns on existing tables
-- ---------------------------------------------------------------------
alter table public.temas        add column pizarra_id uuid references public.pizarras(id);
alter table public.responsables add column pizarra_id uuid references public.pizarras(id);
alter table public.etiquetas    add column pizarra_id uuid references public.pizarras(id);
alter table public.expedientes  add column pizarra_id uuid references public.pizarras(id);
alter table public.temas        add column columna_id uuid references public.columnas(id);

-- ---------------------------------------------------------------------
-- Migración: la instancia actual pasa a ser la primera pizarra. Los
-- nombres de columnas quedan idénticos a los valores viejos de
-- temas.estado (sin acentuar "En revision") para no romper ningún
-- lookup/CSS existente basado en ese string; el ajuste de tipografía/
-- acentuación es responsabilidad del rebrand visual (fase 6).
-- ---------------------------------------------------------------------
do $$
declare
  v_pizarra_id uuid;
  v_creador_id uuid;
  v_col_pend   uuid;
  v_col_curso  uuid;
  v_col_rev    uuid;
  v_col_bloq   uuid;
  v_col_cerr   uuid;
begin
  select id into v_creador_id from auth.users where lower(email) = 'jorgerios.estudio@gmail.com';

  insert into public.pizarras (nombre, tipo, creador_id, accesorios)
  values ('Subsecretaría de Obras y Servicios', 'colaborativa', v_creador_id,
          '{"expediente":{"enabled":true,"tipo":"GDE"}}'::jsonb)
  returning id into v_pizarra_id;

  insert into public.columnas (pizarra_id, nombre, es_inicial, es_final, color, orden)
  values (v_pizarra_id, 'Pendiente', true, false, 'cool-neutral', 0)
  returning id into v_col_pend;
  insert into public.columnas (pizarra_id, nombre, es_inicial, es_final, color, orden)
  values (v_pizarra_id, 'En curso', false, false, 'orange', 1)
  returning id into v_col_curso;
  insert into public.columnas (pizarra_id, nombre, es_inicial, es_final, color, orden)
  values (v_pizarra_id, 'En revision', false, false, 'orange-light', 2)
  returning id into v_col_rev;
  insert into public.columnas (pizarra_id, nombre, es_inicial, es_final, color, orden)
  values (v_pizarra_id, 'Bloqueado', false, false, 'rust', 3)
  returning id into v_col_bloq;
  insert into public.columnas (pizarra_id, nombre, es_inicial, es_final, color, orden)
  values (v_pizarra_id, 'Cerrado', false, true, 'ink-dark', 4)
  returning id into v_col_cerr;

  update public.temas set pizarra_id = v_pizarra_id;
  update public.responsables set pizarra_id = v_pizarra_id;
  update public.etiquetas set pizarra_id = v_pizarra_id;
  update public.expedientes set pizarra_id = v_pizarra_id;

  update public.temas set columna_id = case estado
    when 'Pendiente'   then v_col_pend
    when 'En curso'    then v_col_curso
    when 'En revision' then v_col_rev
    when 'Bloqueado'   then v_col_bloq
    when 'Cerrado'     then v_col_cerr
  end;

  insert into public.pizarra_colaboradores (pizarra_id, usuario_id, permiso, estado, invitado_por)
  select v_pizarra_id, p.id, 'edit', 'aceptada', v_creador_id
  from public.profiles p
  where p.aprobado = true and p.activo = true and p.id <> v_creador_id;
end $$;

-- ---------------------------------------------------------------------
-- Cierre: columnas quedan NOT NULL, se elimina temas.estado (cutover limpio)
-- ---------------------------------------------------------------------
alter table public.temas alter column pizarra_id set not null;
alter table public.temas alter column columna_id set not null;
alter table public.responsables alter column pizarra_id set not null;
alter table public.etiquetas alter column pizarra_id set not null;
alter table public.expedientes alter column pizarra_id set not null;

alter table public.temas drop column estado;

create index idx_temas_pizarra on public.temas(pizarra_id);
create index idx_temas_columna on public.temas(columna_id);
create index idx_responsables_pizarra on public.responsables(pizarra_id);
create index idx_etiquetas_pizarra on public.etiquetas(pizarra_id);
create index idx_expedientes_pizarra on public.expedientes(pizarra_id);
create index idx_pizarra_colab_usuario on public.pizarra_colaboradores(usuario_id);
create index idx_columnas_pizarra on public.columnas(pizarra_id);

-- ---------------------------------------------------------------------
-- Funciones de permisos por pizarra (aditivas; is_admin/can_edit/
-- is_approved_user globales siguen gobernando SOLO la aprobación de
-- usuarios a nivel plataforma, no se tocan).
-- ---------------------------------------------------------------------
create or replace function public.is_board_creator(p_pizarra_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.pizarras where id = p_pizarra_id and creador_id = auth.uid()
  );
$$;

create or replace function public.can_view_board(p_pizarra_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_board_creator(p_pizarra_id) or exists(
    select 1 from public.pizarra_colaboradores
    where pizarra_id = p_pizarra_id and usuario_id = auth.uid() and estado = 'aceptada'
  );
$$;

create or replace function public.can_edit_board(p_pizarra_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_board_creator(p_pizarra_id) or exists(
    select 1 from public.pizarra_colaboradores
    where pizarra_id = p_pizarra_id and usuario_id = auth.uid() and estado = 'aceptada' and permiso = 'edit'
  );
$$;

create or replace function public.can_view_tema(p_tema_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select case when t.privado then public.is_board_creator(t.pizarra_id)
              else public.can_view_board(t.pizarra_id) end
  from public.temas t where t.id = p_tema_id;
$$;

create or replace function public.tema_pizarra_id(p_tema_id text)
returns uuid language sql stable security definer set search_path = public as $$
  select pizarra_id from public.temas where id = p_tema_id;
$$;

create or replace function public.hito_tema_id(p_hito_id text)
returns text language sql stable security definer set search_path = public as $$
  select tema_id from public.hitos where id = p_hito_id;
$$;

create or replace function public.documento_pizarra_visible(p_tema_id text, p_hito_id text, p_expediente_numero text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_tema_id is not null then public.can_view_tema(p_tema_id)
    when p_hito_id is not null then public.can_view_tema(public.hito_tema_id(p_hito_id))
    when p_expediente_numero is not null then public.can_view_board(
      (select pizarra_id from public.expedientes where numero = p_expediente_numero))
    else false
  end;
$$;

create or replace function public.documento_pizarra_editable(p_tema_id text, p_hito_id text, p_expediente_numero text)
returns boolean language sql stable security definer set search_path = public as $$
  select (case
    when p_tema_id is not null then public.can_edit_board(public.tema_pizarra_id(p_tema_id))
    when p_hito_id is not null then public.can_edit_board(public.tema_pizarra_id(public.hito_tema_id(p_hito_id)))
    when p_expediente_numero is not null then public.can_edit_board(
      (select pizarra_id from public.expedientes where numero = p_expediente_numero))
    else false
  end) and public.documento_pizarra_visible(p_tema_id, p_hito_id, p_expediente_numero);
$$;

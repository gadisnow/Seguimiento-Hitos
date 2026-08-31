-- ---------------------------------------------------------------------
-- 033_dashboard_kpi_snapshots.sql
-- Historial diario de los KPIs del Dashboard, por pizarra, para poder
-- comparar "esta semana vs. la semana pasada" y mostrar una flecha de
-- avance. Se guarda SIEMPRE en base al Dashboard sin filtros (los
-- filtros de responsable/estado/prioridad/etiqueta son de exploracion
-- puntual del usuario, no tiene sentido guardar una foto por cada
-- combinacion posible).
--
-- No hay cron/Edge Function: el propio cliente escribe la foto de "hoy"
-- (upsert) la primera vez que alguien con permiso de edicion abre el
-- Dashboard ese dia (ver app.js). Coherente con "Actualizar datos: se
-- hace desde la app" de CLAUDE.md -- nada de jobs server-side nuevos.
-- ---------------------------------------------------------------------

create table if not exists public.dashboard_kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  pizarra_id uuid not null references public.pizarras(id) on delete cascade,
  fecha date not null,
  temas_activos integer not null,
  temas_vencidos integer not null,
  hitos_vencidos integer not null,
  sin_actividad integer not null,
  bloqueados integer not null,
  cerrados_historicos integer not null,
  tiempo_prom_resolucion numeric not null,
  updated_at timestamptz not null default now(),
  unique (pizarra_id, fecha)
);

alter table public.dashboard_kpi_snapshots enable row level security;

create policy dashboard_kpi_snapshots_select on public.dashboard_kpi_snapshots
  for select using (can_view_board(pizarra_id));

create policy dashboard_kpi_snapshots_insert on public.dashboard_kpi_snapshots
  for insert with check (can_edit_board(pizarra_id));

create policy dashboard_kpi_snapshots_update on public.dashboard_kpi_snapshots
  for update using (can_edit_board(pizarra_id)) with check (can_edit_board(pizarra_id));

create index if not exists dashboard_kpi_snapshots_pizarra_fecha_idx
  on public.dashboard_kpi_snapshots (pizarra_id, fecha desc);

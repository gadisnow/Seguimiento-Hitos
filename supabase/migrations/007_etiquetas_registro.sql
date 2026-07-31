-- =====================================================================
-- 007_etiquetas_registro.sql
-- Catalogo central de etiquetas (estilo Trello), independiente de los
-- temas. temas.etiquetas (jsonb, ver 006) sigue siendo la copia embebida
-- que usa el render de las tarjetas; renombrar/recolorear una etiqueta
-- del catalogo se propaga a esa copia desde el cliente (dataApi).
-- =====================================================================

create table if not exists public.etiquetas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  color      text not null,
  orden      integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_etiquetas_nombre on public.etiquetas (lower(nombre));

drop trigger if exists trg_updated_at on public.etiquetas;
create trigger trg_updated_at before update on public.etiquetas
  for each row execute function public.set_updated_at();

-- Backfill: etiquetas ya usadas en algun tema (una fila por nombre distinto,
-- se queda con el primer color visto).
insert into public.etiquetas (nombre, color, orden)
select nombre, color, row_number() over (order by lower(nombre))
from (
  select distinct on (lower(e->>'nombre')) (e->>'nombre') as nombre, (e->>'color') as color
  from public.temas, jsonb_array_elements(etiquetas) as e
  where coalesce(e->>'nombre', '') <> ''
  order by lower(e->>'nombre')
) dedup
on conflict (lower(nombre)) do nothing;

-- ---------------- RLS -------------------------------------------------
alter table public.etiquetas enable row level security;

drop policy if exists etiquetas_select on public.etiquetas;
create policy etiquetas_select on public.etiquetas
  for select using (public.is_approved_user());

drop policy if exists etiquetas_insert on public.etiquetas;
create policy etiquetas_insert on public.etiquetas
  for insert with check (public.can_edit());

drop policy if exists etiquetas_update on public.etiquetas;
create policy etiquetas_update on public.etiquetas
  for update using (public.can_edit()) with check (public.can_edit());

drop policy if exists etiquetas_delete on public.etiquetas;
create policy etiquetas_delete on public.etiquetas
  for delete using (public.is_admin());

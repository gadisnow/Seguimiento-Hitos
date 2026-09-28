-- ---------------------------------------------------------------------
-- 034_notas.sql
-- Nueva seccion "Notas": bloc de notas libres por pizarra (no atadas a
-- un tema/hito puntual, a diferencia de comentarios). Cualquier
-- colaborador con permiso de edicion puede crear/editar/borrar
-- cualquier nota del tablero -- no solo la propia (a diferencia de
-- comentarios_update/delete, ver 025_comentarios_editar_solo_autor.sql).
-- Mismo criterio de permiso que temas/hitos: can_edit_board(pizarra_id).
-- ---------------------------------------------------------------------

create table if not exists public.notas (
  id           uuid primary key default gen_random_uuid(),
  pizarra_id   uuid not null references public.pizarras(id) on delete cascade,
  titulo       text not null default '',
  contenido    text not null default '', -- HTML de Quill, sanitizado en el cliente (DOMPurify) antes de guardar
  user_id      uuid references public.profiles(id) on delete set null,
  autor_nombre text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.notas enable row level security;

create policy notas_select on public.notas
  for select using (can_view_board(pizarra_id));

create policy notas_insert on public.notas
  for insert with check (can_edit_board(pizarra_id));

create policy notas_update on public.notas
  for update using (can_edit_board(pizarra_id)) with check (can_edit_board(pizarra_id));

create policy notas_delete on public.notas
  for delete using (can_edit_board(pizarra_id));

create index if not exists notas_pizarra_updated_idx on public.notas(pizarra_id, updated_at desc);

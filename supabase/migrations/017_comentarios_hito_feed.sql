-- =====================================================================
-- 017_comentarios_hito_feed.sql
-- Fase 3: comentarios enriquecidos, asociables a un hito puntual del
-- tema, con menciones a colaboradores de la pizarra. No se abre un hilo
-- separado por hito — hito_id es solo una etiqueta dentro del mismo feed.
-- =====================================================================

alter table public.comentarios
  add column hito_id text references public.hitos(id) on delete set null,
  add column menciones uuid[] not null default '{}'::uuid[];

create index idx_comentarios_hito on public.comentarios(hito_id);

-- Resuelve creador + colaboradores aceptados de una pizarra (id/nombre/
-- email) para armar la lista de candidatos a @mencionar. Solo devuelve
-- filas si quien llama puede ver esa pizarra (no expone perfiles fuera
-- de ese circulo, sorteando el RLS restrictivo de profiles a proposito
-- y de forma acotada).
create or replace function public.get_board_members(p_pizarra_id uuid)
returns table(id uuid, nombre text, email text)
language sql stable security definer set search_path = public as $$
  select p.id, p.nombre, p.email
  from public.profiles p
  where public.can_view_board(p_pizarra_id)
    and (
      p.id = (select creador_id from public.pizarras where id = p_pizarra_id)
      or exists (
        select 1 from public.pizarra_colaboradores pc
        where pc.pizarra_id = p_pizarra_id and pc.usuario_id = p.id and pc.estado = 'aceptada'
      )
    );
$$;

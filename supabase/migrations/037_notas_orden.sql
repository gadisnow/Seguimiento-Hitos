-- ---------------------------------------------------------------------
-- 037_notas_orden.sql
-- Orden manual de notas dentro de un grupo (arrastrar para reordenar en
-- el popup de grupo, ver app.js). Mismo patron que temas/hitos
-- (reorderTemas/reorderHitos en dataApi.js): una columna 'orden' simple,
-- reasignada con un UPDATE por fila al soltar el drag.
--
-- Backfill: se asigna un orden inicial por grupo segun el orden actual
-- (updated_at desc, que es como se mostraban hasta ahora) para que nada
-- cambie de posicion visualmente hasta que alguien arrastre algo a mano.
-- Las notas sin grupo tambien quedan con un valor (no se usa para
-- ordenarlas hoy, pero no cuesta nada dejarlas consistentes).
-- ---------------------------------------------------------------------

alter table public.notas add column if not exists orden integer;

with numerado as (
  select id, row_number() over (
    partition by pizarra_id, coalesce(grupo_id::text, 'sin-grupo')
    order by updated_at desc
  ) - 1 as rn
  from public.notas
)
update public.notas n
set orden = numerado.rn
from numerado
where numerado.id = n.id and n.orden is null;

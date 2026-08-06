-- =====================================================================
-- 016_columnas_paleta_original.sql
-- Restaura la paleta original de las 5 columnas base (rojo/azul/violeta/
-- ambar/verde, tal como estaba antes del intento de paleta "familia ink/
-- naranja de marca" de la fase 2) y agrega 7 colores complementarios
-- nuevos para columnas creadas por el usuario. Los nombres de columna
-- (cool-neutral/orange/orange-light/rust/ink-dark/neutral) quedan
-- reemplazados por claves que describen el color real, para que no haya
-- desalineacion entre la clave guardada y el color mostrado.
-- =====================================================================

-- Se saca el check constraint viejo ANTES de remapear filas: si se deja
-- puesto, el UPDATE a una clave nueva (todavia no permitida) falla.
alter table public.columnas drop constraint columnas_color_check;

update public.columnas set color = 'red'    where color = 'cool-neutral';
update public.columnas set color = 'blue'   where color = 'orange';
update public.columnas set color = 'violet' where color = 'orange-light';
update public.columnas set color = 'amber'  where color = 'rust';
update public.columnas set color = 'green'  where color = 'ink-dark';
update public.columnas set color = 'warm-gray' where color = 'neutral';

alter table public.columnas add constraint columnas_color_check check (
  color in (
    'red', 'blue', 'violet', 'amber', 'green',
    'pink', 'cyan', 'lime', 'magenta', 'teal', 'amber-dark', 'warm-gray'
  )
);
alter table public.columnas alter column color set default 'warm-gray';

create or replace function public.add_columna_pizarra(p_pizarra_id uuid, p_nombre text, p_color text default 'warm-gray')
returns uuid language plpgsql as $$
declare
  v_final_orden integer;
  v_new_id uuid;
begin
  if not public.can_edit_board(p_pizarra_id) then
    raise exception 'No autorizado para agregar columnas a esta pizarra';
  end if;
  select orden into v_final_orden from public.columnas where pizarra_id = p_pizarra_id and es_final limit 1;
  if v_final_orden is null then
    raise exception 'La pizarra no tiene columna final configurada';
  end if;
  update public.columnas set orden = orden + 1 where pizarra_id = p_pizarra_id and orden >= v_final_orden;
  insert into public.columnas (pizarra_id, nombre, es_inicial, es_final, color, orden)
  values (p_pizarra_id, p_nombre, false, false, coalesce(p_color, 'warm-gray'), v_final_orden)
  returning id into v_new_id;
  return v_new_id;
end;
$$;

-- =====================================================================
-- 013_columnas_estructura.sql
-- Soporte para columnas de pizarra configurables (fase 2): reordenar sin
-- chocar contra la unicidad (pizarra_id, orden), agregar una columna
-- intermedia atomicamente, y bloquear el borrado de la inicial/final o
-- de columnas que todavia tienen temas.
-- =====================================================================

-- La unicidad de (pizarra_id, orden) pasa de indice a constraint
-- DEFERRABLE: al reordenar varias columnas dentro de una misma funcion/
-- transaccion, los valores intermedios pueden chocar transitoriamente
-- antes de asentarse; con INITIALLY DEFERRED el chequeo se hace recien
-- al final de la transaccion.
drop index if exists public.columnas_pizarra_orden_uq;
alter table public.columnas
  add constraint columnas_pizarra_orden_uq unique (pizarra_id, orden) deferrable initially deferred;

-- Reordena TODAS las columnas de una pizarra segun el arreglo de ids
-- recibido (orden = posicion en el arreglo). Se ejecuta con los permisos
-- del usuario que llama (no security definer): las políticas RLS de
-- columnas_update siguen aplicando fila por fila.
create or replace function public.reorder_columnas(p_pizarra_id uuid, p_ordered_ids uuid[])
returns void language plpgsql as $$
declare
  i integer := 0;
  cid uuid;
begin
  if not public.can_edit_board(p_pizarra_id) then
    raise exception 'No autorizado para reordenar columnas de esta pizarra';
  end if;
  foreach cid in array p_ordered_ids loop
    update public.columnas set orden = i where id = cid and pizarra_id = p_pizarra_id;
    i := i + 1;
  end loop;
end;
$$;

-- Inserta una columna intermedia nueva justo antes de la columna final,
-- corriendo el orden de esta (y de cualquier columna ya ubicada en o
-- despues de esa posicion) un lugar hacia atras. Atomico por ser una
-- unica llamada a funcion (una sola transaccion implicita).
create or replace function public.add_columna_pizarra(p_pizarra_id uuid, p_nombre text, p_color text default 'neutral')
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
  values (p_pizarra_id, p_nombre, false, false, coalesce(p_color, 'neutral'), v_final_orden)
  returning id into v_new_id;
  return v_new_id;
end;
$$;

-- Guardas de borrado: ni la inicial ni la final se pueden eliminar, y
-- ninguna columna con temas todavia asignados (el FK temas.columna_id
-- ya lo impediria con un error crudo; esto da un mensaje claro antes).
create or replace function public.guard_columna_delete()
returns trigger language plpgsql as $$
begin
  if old.es_inicial or old.es_final then
    raise exception 'No se puede eliminar la columna inicial o final de la pizarra';
  end if;
  if exists (select 1 from public.temas where columna_id = old.id) then
    raise exception 'No se puede eliminar una columna que todavia tiene temas';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_guard_columna_delete on public.columnas;
create trigger trg_guard_columna_delete before delete on public.columnas
  for each row execute function public.guard_columna_delete();

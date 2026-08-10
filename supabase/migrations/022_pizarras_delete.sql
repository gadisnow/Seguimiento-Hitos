-- =====================================================================
-- 022_pizarras_delete.sql
-- Permite eliminar una pizarra completa (dueno) o salir de ella
-- (colaborador, ya cubierto por pc_delete existente -- no requiere
-- cambios aca). La pizarra colaborativa semilla original queda protegida
-- (columna nueva `protegida`), el resto (incluida la personal de cada
-- uno) se puede borrar.
--
-- Bug encontrado al implementar esto: las FK de temas/responsables/
-- etiquetas/expedientes hacia pizarras(id) NO tenian ON DELETE CASCADE
-- (a diferencia de hitos/comentarios/activity_log/documentos/columnas/
-- pizarra_colaboradores, que si cascadean desde la migracion 011/019) --
-- borrar una pizarra con algun tema/responsable/etiqueta/expediente
-- hubiera reventado con foreign_key_violation, mismo patron de bug que
-- ya aparecio con profiles/temas_creado_por_fkey.
--
-- Ademas trg_guard_columna_delete (016) bloquea borrar columnas
-- es_inicial/es_final SIEMPRE, incluso cuando es parte del cascade de
-- borrar la pizarra entera -- se le agrega un bypass explicito via GUC
-- transaction-local, que solo activa delete_pizarra() de aca abajo.
-- =====================================================================

alter table public.pizarras add column protegida boolean not null default false;

-- La pizarra colaborativa semilla original (creada por la migracion 011)
-- comparte el mismo id entre produccion y test (notby-test es un clon),
-- pero para que esto tambien funcione en un despliegue nuevo desde cero
-- se matchea por contenido, no por uuid hardcodeado.
update public.pizarras set protegida = true
where nombre = 'Subsecretaría de Obras y Servicios' and tipo = 'colaborativa';

-- ---------------------------------------------------------------------
-- FK que faltaban cascadear hacia pizarras(id)
-- ---------------------------------------------------------------------
alter table public.responsables drop constraint responsables_pizarra_id_fkey;
alter table public.responsables add constraint responsables_pizarra_id_fkey
  foreign key (pizarra_id) references public.pizarras(id) on delete cascade;

alter table public.temas drop constraint temas_pizarra_id_fkey;
alter table public.temas add constraint temas_pizarra_id_fkey
  foreign key (pizarra_id) references public.pizarras(id) on delete cascade;

alter table public.expedientes drop constraint expedientes_pizarra_id_fkey;
alter table public.expedientes add constraint expedientes_pizarra_id_fkey
  foreign key (pizarra_id) references public.pizarras(id) on delete cascade;

alter table public.etiquetas drop constraint etiquetas_pizarra_id_fkey;
alter table public.etiquetas add constraint etiquetas_pizarra_id_fkey
  foreign key (pizarra_id) references public.pizarras(id) on delete cascade;

-- ---------------------------------------------------------------------
-- Bypass explicito de las dos protecciones del guard (columna fija, y
-- columna con temas todavia adentro), solo para un borrado de pizarra
-- completo (ver delete_pizarra mas abajo). Hace falta bypassear TAMBIEN
-- la de "todavia tiene temas": dentro del mismo DELETE en cascada sobre
-- pizarras, el orden en que Postgres procesa columnas vs temas no esta
-- garantizado -- probado en vivo contra notby-test, la guard de temas
-- disparaba igual aunque esos temas iban a desaparecer en la misma
-- sentencia. Cualquier otro intento de borrar una columna suelta (fuera
-- de este bypass) sigue con las dos protecciones intactas.
-- ---------------------------------------------------------------------
create or replace function public.guard_columna_delete()
returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('app.allow_columna_delete', true), 'false') = 'true' then
    return old;
  end if;
  if old.es_inicial or old.es_final then
    raise exception 'No se puede eliminar la columna inicial o final de la pizarra';
  end if;
  if exists (select 1 from public.temas where columna_id = old.id) then
    raise exception 'No se puede eliminar una columna que todavia tiene temas';
  end if;
  return old;
end;
$$;

-- ---------------------------------------------------------------------
-- Elimina una pizarra completa. Solo el dueno, y nunca la protegida.
-- security definer + chequeo manual, mismo patron que
-- add_columna_pizarra (016_columnas_paleta_original.sql).
-- ---------------------------------------------------------------------
create or replace function public.delete_pizarra(p_pizarra_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_board_creator(p_pizarra_id) then
    raise exception 'Solo el dueno de la pizarra puede eliminarla';
  end if;
  if exists (select 1 from public.pizarras where id = p_pizarra_id and protegida) then
    raise exception 'Esta pizarra no se puede eliminar';
  end if;
  perform set_config('app.allow_columna_delete', 'true', true);
  delete from public.pizarras where id = p_pizarra_id;
end;
$$;

-- Defensa en profundidad: tambien bloquear un DELETE directo a la tabla
-- (sin pasar por la RPC) sobre la pizarra protegida.
drop policy pizarras_delete on public.pizarras;
create policy pizarras_delete on public.pizarras
  for delete using (public.is_approved_user() and creador_id = auth.uid() and not protegida);

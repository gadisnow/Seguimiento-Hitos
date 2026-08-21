-- ---------------------------------------------------------------------
-- 032_columna_archivados.sql
-- Nueva columna "Archivados" en cada pizarra existente, despues de
-- "Cerrado" (orden mas alto que cualquier columna actual).
--
-- Flag nuevo es_archivado (no se reusa es_final): hay un indice unico
-- parcial (columnas_pizarra_final_uq, 011_pizarras.sql) que exige como
-- maximo UNA columna es_final por pizarra -- "Cerrado" ya la ocupa. Se
-- agrega la misma clase de indice para es_archivado, y en el codigo
-- (app.js) el criterio de "tema en estado final/bloqueado para editar"
-- pasa a chequear esFinal || esArchivado en vez de comparar
-- tema.estado === 'Cerrado' -- asi un tema archivado hereda el mismo
-- bloqueo de solo lectura que uno cerrado sin duplicar la regla.
--
-- No se toca RLS: columnas_insert/update/delete ya usan can_edit_board
-- (cualquier colaborador con permiso de editar, no solo el dueno) --
-- es exactamente el permiso pedido para archivar (cualquier colaborador
-- puede mover un tema a esta columna, igual que a cualquier otra).
-- ---------------------------------------------------------------------

alter table public.columnas add column if not exists es_archivado boolean not null default false;

create unique index if not exists columnas_pizarra_archivado_uq
  on public.columnas(pizarra_id) where es_archivado;

insert into public.columnas (pizarra_id, nombre, es_inicial, es_final, es_archivado, color, orden)
select
  p.id,
  'Archivados',
  false,
  false,
  true,
  'warm-gray',
  coalesce((select max(c2.orden) from public.columnas c2 where c2.pizarra_id = p.id), -1) + 1
from public.pizarras p
where not exists (
  select 1 from public.columnas c3 where c3.pizarra_id = p.id and c3.es_archivado
);

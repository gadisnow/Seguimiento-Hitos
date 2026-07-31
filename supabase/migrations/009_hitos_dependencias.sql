-- ---------------------------------------------------------------------
-- Dependencias logicas entre hitos de una misma tarea (estilo MS Project):
-- predecesor + tipo de vinculo (FC/CC/FF) + modo de fecha (fecha especifica
-- o desfasaje en dias) + duracion propia. fecha_inicio/fecha_limite pasan a
-- ser CALCULADAS por el motor en app.js (cascada topologica) en vez de
-- editadas directamente; se siguen persistiendo en las mismas columnas.
--
-- Por ahora un hito admite un unico predecesor (fk simple). El chequeo de
-- ciclos se hace en el cliente antes de guardar.
-- ---------------------------------------------------------------------
alter table public.hitos
  add column if not exists predecesor_id  text references public.hitos(id) on delete set null,
  add column if not exists tipo_vinculo   text check (tipo_vinculo in ('FC','CC','FF')),
  add column if not exists modo_fecha     text not null default 'fecha' check (modo_fecha in ('fecha','dias')),
  add column if not exists desfasaje_dias integer,
  add column if not exists fecha_manual   date,
  add column if not exists duracion_propia integer not null default 4;

create index if not exists idx_hitos_predecesor on public.hitos(predecesor_id);

-- Backfill: los hitos existentes no tienen predecesor, asi que su fechaFin
-- calculada = fecha_manual. Copiamos el vencimiento actual para que no
-- cambien de fecha al pasar por el nuevo motor de calculo.
update public.hitos
  set fecha_manual = fecha_limite
  where fecha_manual is null and fecha_limite is not null;

-- duracion_propia: reconstruida desde el rango existente cuando hay
-- fecha_inicio y fecha_limite cargadas; si no, se deja el default (4).
update public.hitos
  set duracion_propia = greatest(1, (fecha_limite - fecha_inicio))
  where fecha_inicio is not null and fecha_limite is not null
    and fecha_limite > fecha_inicio;

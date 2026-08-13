-- ---------------------------------------------------------------------
-- 026_hitos_cf_y_fecha_minima.sql
-- Rediseno del panel de edicion de hito: agrega el tipo de vinculo CF
-- (Comienzo-Fin) a FC/CC/FF, y una fecha piso opcional ("no arrancar
-- antes de") para hitos en modo 'dias' con predecesor.
--
-- El check de tipo_vinculo se agrego sin nombre explicito en 009 (alter
-- table ... add column ... check(...)) -> Postgres uso el nombre default
-- {tabla}_{columna}_check. Verificado contra la base (2026-08-13) que
-- sigue siendo hitos_tipo_vinculo_check.
-- ---------------------------------------------------------------------

alter table public.hitos drop constraint hitos_tipo_vinculo_check;
alter table public.hitos add constraint hitos_tipo_vinculo_check
  check (tipo_vinculo in ('FC','CC','FF','CF'));

alter table public.hitos
  add column if not exists fecha_minima date;

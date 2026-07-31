-- ---------------------------------------------------------------------
-- Congelar los "dias restantes" al cerrar un hito (espejo de
-- temas.fecha_cierre): se fija al pasar a Cerrado y se limpia si se
-- revierte el estado, para que el conteo continue.
-- ---------------------------------------------------------------------
alter table public.hitos
  add column if not exists fecha_cierre date;

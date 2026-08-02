-- ---------------------------------------------------------------------
-- Provincia / Municipio del tema, usados por el modulo de Reportes
-- (columnas del template de la Planilla). Nullables, no afectan datos
-- existentes.
-- ---------------------------------------------------------------------
alter table public.temas
  add column if not exists provincia text,
  add column if not exists municipio text;

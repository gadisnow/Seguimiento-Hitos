-- ---------------------------------------------------------------------
-- Etiquetas estilo Trello: array de { nombre, color } por tema.
-- ---------------------------------------------------------------------
alter table public.temas
  add column if not exists etiquetas jsonb not null default '[]'::jsonb;

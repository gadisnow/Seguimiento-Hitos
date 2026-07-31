-- =====================================================================
-- 005_seed_data.sql
-- Semilla técnica derivada de seedData (app.js). Idempotente.
-- Estados ya normalizados; códigos T-00x / H-00x-y preservados como PK.
-- =====================================================================

-- ---------------- responsables --------------------------------------
insert into public.responsables (nombre, apellido, dependencia) values
  ('Jorge','Rios','SSOyS'),
  ('Alejandro','B',null),
  ('Luis','Mesones',null),
  ('Gabriela',null,null),
  ('Karina',null,null),
  ('Marielda',null,null),
  ('Luisina',null,null)
on conflict do nothing;

-- ---------------- expedientes ---------------------------------------
insert into public.expedientes
  (numero, gde_url, tema_asociado, fecha_inicio, fecha_limite, ultima_actualizacion, responsable_text, estado) values
  ('EX-2022-94776460-APN-CEFISU#MDS','https://gde.example/EX-2022-94776460','NRU 1763 - Barrio Avenida de las Americas','2026-05-19','2026-06-15','2026-05-26','Alejandro B','Activo'),
  ('EX-2022-130503405-APN-CEFISU#MDS','https://gde.example/EX-2022-130503405','Loteo Parque Sur - Catamarca','2026-05-19','2026-06-12','2026-05-23','Luis Mesones','Activo'),
  ('EX-2026-33988163-APN-DGDA#MEC','https://gde.example/EX-2026-33988163','Designaciones KL y LR','2026-05-15','2026-06-05','2026-05-28','Privada','Activo')
on conflict (numero) do nothing;

-- ---------------- temas ---------------------------------------------
insert into public.temas
  (id, codigo, nombre, programa, solicitante, prioridad, responsable_text, estado,
   expediente_numero, gde_url, fecha_inicio, fecha_limite, ultima_actualizacion, descripcion, orden) values
  ('T-001','T-001','Declaracion Jurada Anual de Patrimonio (periodo 2025)','Personales','Valeria Ricco','Media','Jorge Rios','Pendiente',
    null,null,'2026-05-04','2026-07-31','2026-05-26','VTO 31 de julio de 2026. Jorge avisado el 26/5.',1),
  ('T-002','T-002','NRU 1763 - Barrio Avenida de las Americas - Municipalidad de Concepcion','DNISU','Natalia Hilu, Pablo Morillo','Alta','Alejandro B','En curso',
    'EX-2022-94776460-APN-CEFISU#MDS','https://gde.example/EX-2022-94776460','2026-05-19','2026-06-15','2026-05-26','Validacion del Certificado de avance N02 (60%) por auditor externo.',2),
  ('T-003','T-003','NRU 1754 - Barrio Santa Barbara 1 y 2 - Cooperativa Santa Barbara Ltda','DNISU','Jose Paredes, Natalia Hilu','Media','Alejandro B','Pendiente',
    null,null,'2026-05-19','2026-06-30','2026-05-22',null,3),
  ('T-004','T-004','Estado proyectos 5797, 5798, 5799 - Fundacion Trazando Futuro / Coop. Suenos en Comun','DNISU','Sebastian Pareja','Media','Alejandro B','Pendiente',
    null,null,'2026-05-19','2026-06-29','2026-05-19',null,4),
  ('T-005','T-005','Loteo Parque Sur - Municipalidad de Catamarca','DNISU','Jose Paredes, Natalia Hilu, Valeria Sanchez','Alta','Luis Mesones','En curso',
    'EX-2022-130503405-APN-CEFISU#MDS','https://gde.example/EX-2022-130503405','2026-05-19','2026-06-12','2026-05-23','RDT 5 - rendiciones enviadas el 07-05-26.',5),
  ('T-006','T-006','Convenio Traspaso a Cordoba - Barrio Zepa SISU','DNISU','BH, Adrian Danieli','Alta','Gabriela','En curso',
    null,null,'2026-05-19','2026-06-05','2026-05-25',null,6),
  ('T-007','T-007','Seguimiento 3 expedientes de subastas - Liceo / Estacion Buenos Aires / La Plata','PROCREAR','BH','Alta','Karina','En curso',
    null,null,'2026-05-19','2026-06-02','2026-05-27',null,7),
  ('T-008','T-008','Concesion Palais de Glace','Concesiones','Ignacio Lupi','Alta','Luisina','Bloqueado',
    null,null,'2026-05-20','2026-06-30','2026-05-28',null,8),
  ('T-009','T-009','Concesion ETOR','Concesiones','Ignacio Lupi','Alta','Luisina','Bloqueado',
    null,null,'2026-05-20','2026-06-08','2026-05-20',null,9),
  ('T-010','T-010','Concesion Muse MARQ','Concesiones','Ignacio Lupi','Media','Luisina','Cerrado',
    null,null,'2026-05-20','2026-06-20','2026-05-20',null,10),
  ('T-011','T-011','13 Foro Urbano Mundial (WUF13) MINURVI','Institucionales','Wenceslao Maislin','Baja','Jorge Rios','En revision',
    null,null,'2026-05-14','2026-12-15','2026-05-28','Mayo 2026: definir ejes tematicos. Julio 2026: avances en plenaria virtual. Diciembre 2026: informe final.',11),
  ('T-012','T-012','Expedientes designaciones KL y LR','Administracion','Privada','Media','Privada','Cerrado',
    'EX-2026-33988163-APN-DGDA#MEC','https://gde.example/EX-2026-33988163','2026-05-15','2026-06-05','2026-05-28',null,12)
on conflict (id) do nothing;

-- ---------------- hitos ---------------------------------------------
insert into public.hitos (id, codigo, tema_id, nombre, responsable_text, estado, fecha_limite, orden) values
  ('H-001-1','H-001-1','T-001','Recibir pedido OA: NO-2026-44395169-APN-SSGAI#MEC','Jorge Rios','Cerrado','2026-05-10',1),
  ('H-001-2','H-001-2','T-001','Completar declaracion con modelo periodo 2024','Jorge Rios','Pendiente','2026-07-15',2),
  ('H-001-3','H-001-3','T-001','Presentar declaracion jurada','Jorge Rios','Bloqueado','2026-07-31',3),
  ('H-002-1','H-002-1','T-002','Enviar certificado al auditor externo','Alejandro B','Cerrado','2026-05-08',1),
  ('H-002-2','H-002-2','T-002','Revision del auditor externo','Luis Mesones','En curso','2026-06-10',2),
  ('H-002-3','H-002-3','T-002','Recepcion de observaciones','Alejandro B','Pendiente','2026-06-12',3),
  ('H-002-4','H-002-4','T-002','Subsanar observaciones','Alejandro B','Pendiente','2026-06-13',4),
  ('H-002-5','H-002-5','T-002','Aprobacion final','Luis Mesones','Pendiente','2026-06-15',5),
  ('H-003-1','H-003-1','T-003','Definicion de circuito para aprobacion de Redeterminacion de precios (C2)','Alejandro B','Pendiente','2026-06-10',1),
  ('H-003-2','H-003-2','T-003','Validacion del certificado por auditoria externa','Luis Mesones','Pendiente','2026-06-20',2),
  ('H-003-3','H-003-3','T-003','Formalizacion del cierre del proyecto','Alejandro B','Pendiente','2026-06-30',3),
  ('H-004-1','H-004-1','T-004','Proy. 5797 - Barrio Quinta de Pelozo - SUM y Playon deportivo','Alejandro B','Pendiente','2026-06-10',1),
  ('H-004-2','H-004-2','T-004','Proy. 5798 - Barrio San Carlos I - Electrica y Nucleos humedos','Alejandro B','Pendiente','2026-06-20',2),
  ('H-004-3','H-004-3','T-004','Proy. 5799 - Barrio Nuevo Amanecer - Electrica, Vereda y arbolado','Alejandro B','Pendiente','2026-06-29',3),
  ('H-005-1','H-005-1','T-005','CO 6, 7 y 8 - Elevacion a Subsecretaria para desembolsos','Alejandro B','En curso','2026-06-05',1),
  ('H-005-2','H-005-2','T-005','RDT 5 - Subsanacion de rendiciones por la UE','Jurisdiccion','Bloqueado','2026-06-08',2),
  ('H-005-3','H-005-3','T-005','RDT 5 - Elevacion del informe','Luis Mesones','Bloqueado','2026-06-12',3),
  ('H-006-1','H-006-1','T-006','Hito 1 - Definicion de alcance','Gabriela','En curso','2026-06-05',1),
  ('H-007-1','H-007-1','T-007','Barrio Liceo - Publicacion en boletin oficial','Karina','En curso','2026-05-31',1),
  ('H-007-2','H-007-2','T-007','Estacion Buenos Aires - Publicacion en boletin oficial','Karina','En curso','2026-06-01',2),
  ('H-007-3','H-007-3','T-007','La Plata - Publicacion en boletin oficial','Marielda','En curso','2026-06-02',3),
  ('H-008-1','H-008-1','T-008','Delegacion de facultades - con expediente','Luisina, Karina','En curso','2026-06-05',1),
  ('H-008-2','H-008-2','T-008','Confeccion de pliegos','Luisina','En curso','2026-06-15',2),
  ('H-008-3','H-008-3','T-008','Llamado a licitacion','Karina','Bloqueado','2026-06-30',3),
  ('H-011-1','H-011-1','T-011','Definicion de ejes tematicos','Jorge Rios','En revision','2026-05-31',1),
  ('H-011-2','H-011-2','T-011','Plenaria virtual de avances','Jorge Rios','Pendiente','2026-07-31',2),
  ('H-012-1','H-012-1','T-012','Karina - EX-2026-33988163-APN-DGDA#MEC en DIYAN#MDYTE','Privada','En curso','2026-05-31',1),
  ('H-012-2','H-012-2','T-012','Luisina - EX-2026-36272697-APN-SICYT#JGM en DIYAN#MDYTE','Privada','En curso','2026-05-31',2)
on conflict (id) do nothing;

-- Historial inicial: "Tema creado" por cada tema (actor = sistema).
insert into public.activity_log (tema_id, event, actor_nombre, created_at)
select t.id, 'Tema creado', 'sistema', (t.fecha_inicio::timestamptz)
from public.temas t
where not exists (
  select 1 from public.activity_log a
  where a.tema_id = t.id and a.event = 'Tema creado'
);

-- Migration: migracion_tipos_turno_v18
-- Phase 40: Reorganización de TipoTurno para v1.8

-- ============================================================
-- PART A: DDL — ningún cambio de schema en esta fase
-- ============================================================

-- ============================================================
-- PART B: Data migration (transactional)
-- ============================================================

BEGIN;

-- Step 1: Crear el nuevo tipo "Consulta" (flujoPaciente=NULL, esCirugia=false)
INSERT INTO "TipoTurno" ("id", "nombre", "esCirugia", "flujoPaciente")
VALUES (gen_random_uuid(), 'Consulta', false, NULL);

-- Step 2: Migrar turnos de "Consulta para cirugía" → "Consulta"
UPDATE "Turno"
SET "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Consulta' LIMIT 1)
WHERE "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Consulta para cirugía' LIMIT 1);

-- Step 3: Migrar turnos de "Consulta pendiente" → "Consulta"
UPDATE "Turno"
SET "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Consulta' LIMIT 1)
WHERE "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Consulta pendiente' LIMIT 1);

-- Step 4: Transferir configs TipoTurnoProfesional de "Consulta para cirugía" → "Consulta"
-- ON CONFLICT DO NOTHING evita violación de unique constraint [profesionalId, tipoTurnoId]
INSERT INTO "TipoTurnoProfesional" (
  "id", "profesionalId", "tipoTurnoId", "duracionMinutos", "colorHex", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  ttp."profesionalId",
  (SELECT id FROM "TipoTurno" WHERE nombre = 'Consulta' LIMIT 1),
  ttp."duracionMinutos",
  ttp."colorHex",
  now(),
  now()
FROM "TipoTurnoProfesional" ttp
WHERE ttp."tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE nombre = 'Consulta para cirugía' LIMIT 1)
ON CONFLICT ("profesionalId", "tipoTurnoId") DO NOTHING;

-- Step 5: Eliminar configs de "Consulta pendiente" (no se transfieren)
DELETE FROM "TipoTurnoProfesional"
WHERE "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Consulta pendiente' LIMIT 1);

-- Step 6: Eliminar configs de "Consulta para cirugía" (ya transferidas al Step 4)
DELETE FROM "TipoTurnoProfesional"
WHERE "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Consulta para cirugía' LIMIT 1);

-- Step 7: Eliminar TipoTurno "Consulta pendiente" (ya sin Turnos ni TipoTurnoProfesional)
DELETE FROM "TipoTurno" WHERE "nombre" = 'Consulta pendiente';

-- Step 8: Eliminar TipoTurno "Consulta para cirugía" (ya sin Turnos ni TipoTurnoProfesional)
DELETE FROM "TipoTurno" WHERE "nombre" = 'Consulta para cirugía';

-- Step 9: Rename "Consulta para tratamiento en consultorio" → "Tratamiento"
-- El id no cambia, TipoTurnoProfesional existentes se preservan automáticamente
UPDATE "TipoTurno"
SET "nombre" = 'Tratamiento'
WHERE "nombre" = 'Consulta para tratamiento en consultorio';

-- Step 10: Rename "Pre-operatorio" → "Pre-Quirúrgico"
-- El id no cambia, TipoTurnoProfesional existentes se preservan automáticamente
UPDATE "TipoTurno"
SET "nombre" = 'Pre-Quirúrgico'
WHERE "nombre" = 'Pre-operatorio';

COMMIT;

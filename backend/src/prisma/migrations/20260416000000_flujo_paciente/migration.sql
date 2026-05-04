-- Migration: flujo_paciente
-- Phase 22: Schema Foundation

-- ============================================================
-- PART A: DDL — Create enum and add columns
-- ============================================================

CREATE TYPE "FlujoPaciente" AS ENUM ('CIRUGIA', 'TRATAMIENTO', 'PENDIENTE');

-- Add flujo to Paciente WITHOUT SQL-level default so existing rows = NULL
-- @default(PENDIENTE) in schema.prisma handles application-level new inserts
ALTER TABLE "Paciente" ADD COLUMN "flujo" "FlujoPaciente";

-- Add flujoPaciente to TipoTurno (nullable, no default)
ALTER TABLE "TipoTurno" ADD COLUMN "flujoPaciente" "FlujoPaciente";

-- ============================================================
-- PART B: Data migration (transactional)
-- ============================================================

BEGIN;

-- Step 1: UPDATE existing 'Control' row to add flujoPaciente = NULL and ensure esCirugia = false
-- (Control keeps its nombre — unique constraint means we can't INSERT a new one)
UPDATE "TipoTurno"
SET "flujoPaciente" = NULL, "esCirugia" = false
WHERE "nombre" = 'Control';

-- Step 2: INSERT the 4 genuinely new TipoTurno records
-- (Control is reused via UPDATE above, so only 4 are inserted)
INSERT INTO "TipoTurno" ("id", "nombre", "esCirugia", "flujoPaciente")
VALUES
  (gen_random_uuid(), 'Consulta para cirugía',                    false, 'CIRUGIA'::"FlujoPaciente"),
  (gen_random_uuid(), 'Consulta para tratamiento en consultorio', false, 'TRATAMIENTO'::"FlujoPaciente"),
  (gen_random_uuid(), 'Pre-operatorio',                           false, 'CIRUGIA'::"FlujoPaciente"),
  (gen_random_uuid(), 'Consulta pendiente',                       false, NULL);

-- Step 3: Reasign Turno.tipoTurnoId from old types to new equivalents
-- 'Consulta Inicial' → 'Consulta pendiente'
UPDATE "Turno"
SET "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Consulta pendiente' LIMIT 1)
WHERE "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Consulta Inicial' LIMIT 1);

-- 'Post-Operatorio' → 'Pre-operatorio'
UPDATE "Turno"
SET "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Pre-operatorio' LIMIT 1)
WHERE "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Post-Operatorio' LIMIT 1);

-- 'Procedimiento' → 'Consulta para tratamiento en consultorio'
UPDATE "Turno"
SET "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Consulta para tratamiento en consultorio' LIMIT 1)
WHERE "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Procedimiento' LIMIT 1);

-- 'Control' → 'Control' (same nombre, no UPDATE needed)

-- Step 4: Delete TipoTurnoProfesional configs for old types (must run BEFORE deleting TipoTurno)
DELETE FROM "TipoTurnoProfesional"
WHERE "tipoTurnoId" IN (
  SELECT id FROM "TipoTurno"
  WHERE "nombre" IN ('Consulta Inicial', 'Post-Operatorio', 'Procedimiento')
);

-- Step 5: Delete old TipoTurno records (Control is kept/reused, not deleted)
DELETE FROM "TipoTurno"
WHERE "nombre" IN ('Consulta Inicial', 'Post-Operatorio', 'Procedimiento');

-- Step 6: Backfill Paciente.flujo
-- Patients with surgery history (esCirugia turno OR active etapaCRM) → CIRUGIA
UPDATE "Paciente" p
SET "flujo" = 'CIRUGIA'::"FlujoPaciente"
WHERE
  EXISTS (
    SELECT 1 FROM "Turno" t
    WHERE t."pacienteId" = p.id AND t."esCirugia" = true
  )
  OR p."etapaCRM" IS NOT NULL;

-- All other existing patients stay NULL (legacy/unclassified)
-- New patients created via application get PENDIENTE from Prisma @default

COMMIT;

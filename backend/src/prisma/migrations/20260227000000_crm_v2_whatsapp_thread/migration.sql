-- Phase 4: CRM enum simplification + MensajeWhatsApp.direccion

-- Step 1: Add PROCEDIMIENTO_REALIZADO to old enum (safe ADD VALUE)
ALTER TYPE "EtapaCRM" ADD VALUE IF NOT EXISTS 'PROCEDIMIENTO_REALIZADO';

-- Step 2: Migrate data away from values being removed
-- SEGUIMIENTO_ACTIVO → CONSULTADO
UPDATE "Paciente" SET "etapaCRM" = 'CONSULTADO'
WHERE "etapaCRM" = 'SEGUIMIENTO_ACTIVO';

UPDATE "ContactoLog" SET "etapaCRMPost" = 'CONSULTADO'
WHERE "etapaCRMPost" = 'SEGUIMIENTO_ACTIVO';

-- CALIENTE (EtapaCRM value, not TemperaturaPaciente) → CONSULTADO
UPDATE "Paciente" SET "etapaCRM" = 'CONSULTADO'
WHERE "etapaCRM" = 'CALIENTE';

UPDATE "ContactoLog" SET "etapaCRMPost" = 'CONSULTADO'
WHERE "etapaCRMPost" = 'CALIENTE';

-- Step 3: Recreate EtapaCRM without SEGUIMIENTO_ACTIVO and CALIENTE
ALTER TYPE "EtapaCRM" RENAME TO "EtapaCRM_old";

CREATE TYPE "EtapaCRM" AS ENUM (
  'NUEVO_LEAD',
  'TURNO_AGENDADO',
  'CONSULTADO',
  'PRESUPUESTO_ENVIADO',
  'PROCEDIMIENTO_REALIZADO',
  'CONFIRMADO',
  'PERDIDO'
);

-- Step 4: Update ALL columns using the old enum type
ALTER TABLE "Paciente"
  ALTER COLUMN "etapaCRM" TYPE "EtapaCRM"
  USING "etapaCRM"::text::"EtapaCRM";

ALTER TABLE "ContactoLog"
  ALTER COLUMN "etapaCRMPost" TYPE "EtapaCRM"
  USING "etapaCRMPost"::text::"EtapaCRM";

-- Step 5: Drop old enum
DROP TYPE "EtapaCRM_old";

-- Step 6: Add DireccionMensajeWA enum
CREATE TYPE "DireccionMensajeWA" AS ENUM ('OUTBOUND', 'INBOUND');

-- Step 7: Add direccion column to MensajeWhatsApp
ALTER TABLE "MensajeWhatsApp"
  ADD COLUMN "direccion" "DireccionMensajeWA" NOT NULL DEFAULT 'OUTBOUND';

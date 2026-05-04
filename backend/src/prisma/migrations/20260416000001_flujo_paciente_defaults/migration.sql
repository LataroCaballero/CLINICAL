-- Set SQL-level default and create indexes for Paciente.flujo
-- Moved here from 20260415221758_flujo_paciente which had a timestamp ordering bug
-- (it ran before 20260416000000_flujo_paciente which actually creates the column).
-- Using IF NOT EXISTS so this is safe to apply on databases that already have these.

ALTER TABLE "Paciente" ALTER COLUMN "flujo" SET DEFAULT 'PENDIENTE';

CREATE INDEX IF NOT EXISTS "Paciente_flujo_idx" ON "Paciente"("flujo");

CREATE INDEX IF NOT EXISTS "Paciente_profesionalId_flujo_idx" ON "Paciente"("profesionalId", "flujo");

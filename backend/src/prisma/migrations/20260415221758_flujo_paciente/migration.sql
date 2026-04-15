-- AlterTable
ALTER TABLE "Paciente" ALTER COLUMN "flujo" SET DEFAULT 'PENDIENTE';

-- CreateIndex
CREATE INDEX "Paciente_flujo_idx" ON "Paciente"("flujo");

-- CreateIndex
CREATE INDEX "Paciente_profesionalId_flujo_idx" ON "Paciente"("profesionalId", "flujo");

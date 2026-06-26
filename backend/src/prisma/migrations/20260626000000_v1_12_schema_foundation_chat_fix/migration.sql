-- DropForeignKey
ALTER TABLE "MensajeInterno" DROP CONSTRAINT "MensajeInterno_autorId_fkey";

-- DropIndex
DROP INDEX "TareaSeguimiento_profesionalId_completada_fechaProgramada_idx";

-- AlterTable
ALTER TABLE "HistoriaClinicaEntrada" ADD COLUMN     "estudiosComplementarios" JSONB;

-- AlterTable
ALTER TABLE "MensajeInterno" ADD COLUMN     "origenPaciente" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "autorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "adicciones" TEXT[],
ADD COLUMN     "alergiasAutoReportadas" TEXT[],
ADD COLUMN     "antecedentesAutoReportados" JSONB,
ADD COLUMN     "consentimientoFirmadoAt" TIMESTAMP(3),
ADD COLUMN     "medicacion" TEXT[],
ADD COLUMN     "medicacionAutoReportada" TEXT[],
ADD COLUMN     "portalToken" TEXT,
ADD COLUMN     "portalTokenGeneradoAt" TIMESTAMP(3),
ADD COLUMN     "tratamientosPreviosAutoReportados" TEXT;

-- AlterTable
ALTER TABLE "TareaSeguimiento" ADD COLUMN     "notificada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificadaEn" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AlergiaCatalogoPro" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "esSistema" BOOLEAN NOT NULL DEFAULT false,
    "profesionalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlergiaCatalogoPro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicamentoCatalogoPro" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "esSistema" BOOLEAN NOT NULL DEFAULT false,
    "profesionalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicamentoCatalogoPro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlergiaCatalogoPro_profesionalId_activo_idx" ON "AlergiaCatalogoPro"("profesionalId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "AlergiaCatalogoPro_nombre_profesionalId_key" ON "AlergiaCatalogoPro"("nombre", "profesionalId");

-- CreateIndex
CREATE INDEX "MedicamentoCatalogoPro_profesionalId_activo_idx" ON "MedicamentoCatalogoPro"("profesionalId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "MedicamentoCatalogoPro_nombre_profesionalId_key" ON "MedicamentoCatalogoPro"("nombre", "profesionalId");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_portalToken_key" ON "Paciente"("portalToken");

-- CreateIndex
CREATE INDEX "TareaSeguimiento_profesionalId_completada_notificada_fechaP_idx" ON "TareaSeguimiento"("profesionalId", "completada", "notificada", "fechaProgramada");

-- AddForeignKey
ALTER TABLE "MensajeInterno" ADD CONSTRAINT "MensajeInterno_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlergiaCatalogoPro" ADD CONSTRAINT "AlergiaCatalogoPro_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicamentoCatalogoPro" ADD CONSTRAINT "MedicamentoCatalogoPro_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHAT-02 cleanup: delete historical flood of system-generated seguimiento alerts.
-- D-06: Run off-peak (23:00–07:00 ART), never at 09:00 when the cron fires, to avoid lock contention.
-- D-01: esSistema=true is produced exclusively by the buggy scheduler; presupuesto messages use esSistema=false and are NOT touched.
-- D-02: MensajeLectura rows are cascade-deleted automatically (onDelete: Cascade) — no manual pre-delete needed.
-- D-03: Captures both "Seguimiento CRM" and "PERSONALIZADA" system alerts — text-LIKE filter was rejected as incomplete.
-- Idempotent: re-running on an empty set is a no-op.
DELETE FROM "MensajeInterno" WHERE "esSistema" = true;

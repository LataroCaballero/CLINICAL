-- AlterTable
-- Brute-force attempt tracking for the patient portal token verification (D-01).
-- Additive and safe: NOT NULL with default + nullable column (no data loss, no prompt).
ALTER TABLE "Paciente" ADD COLUMN     "portalBloqueadoHasta" TIMESTAMP(3),
ADD COLUMN     "portalIntentosFallidos" INTEGER NOT NULL DEFAULT 0;

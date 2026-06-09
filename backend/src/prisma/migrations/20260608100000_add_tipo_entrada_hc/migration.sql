-- CreateEnum
CREATE TYPE "TipoEntradaHC" AS ENUM ('CONSULTA_CIRUGIA', 'TRATAMIENTO', 'CONTROL', 'SEGUIMIENTO', 'PREOPERATORIO');

-- AlterTable
ALTER TABLE "HistoriaClinicaEntrada" ADD COLUMN "tipoEntrada" "TipoEntradaHC";

-- CreateEnum
CREATE TYPE "EstadoCirugia" AS ENUM ('PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA', 'SUSPENDIDA');

-- CreateEnum
CREATE TYPE "TipoAnestesia" AS ENUM ('LOCAL', 'SEDACION', 'GENERAL', 'REGIONAL', 'NINGUNA');

-- AlterTable
ALTER TABLE "Cirugia" ADD COLUMN     "anestesiologo" TEXT,
ADD COLUMN     "ayudante" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "estado" "EstadoCirugia" NOT NULL DEFAULT 'PROGRAMADA',
ADD COLUMN     "horaEstimadaInicio" TEXT,
ADD COLUMN     "notasPostoperatorias" TEXT,
ADD COLUMN     "notasPreoperatorias" TEXT,
ADD COLUMN     "procedimiento" TEXT,
ADD COLUMN     "quirofano" TEXT,
ADD COLUMN     "tipoAnestesia" "TipoAnestesia",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "TipoTurno" ADD COLUMN     "esCirugia" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Cirugia_pacienteId_idx" ON "Cirugia"("pacienteId");

-- CreateIndex
CREATE INDEX "Cirugia_profesionalId_idx" ON "Cirugia"("profesionalId");

-- CreateIndex
CREATE INDEX "Cirugia_fecha_idx" ON "Cirugia"("fecha");

-- AddForeignKey
ALTER TABLE "Cirugia" ADD CONSTRAINT "Cirugia_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

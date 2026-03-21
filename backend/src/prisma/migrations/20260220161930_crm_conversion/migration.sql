-- CreateEnum
CREATE TYPE "EtapaCRM" AS ENUM ('NUEVO_LEAD', 'TURNO_AGENDADO', 'CONSULTADO', 'PRESUPUESTO_ENVIADO', 'SEGUIMIENTO_ACTIVO', 'CALIENTE', 'CONFIRMADO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "TemperaturaPaciente" AS ENUM ('CALIENTE', 'TIBIO', 'FRIO');

-- CreateEnum
CREATE TYPE "MotivoPerdidaCRM" AS ENUM ('PRECIO', 'TIEMPO', 'MIEDO_CIRUGIA', 'PREFIERE_OTRO_PROFESIONAL', 'NO_CANDIDATO_MEDICO', 'NO_RESPONDIO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoTareaSeguimiento" AS ENUM ('SEGUIMIENTO_DIA_3', 'SEGUIMIENTO_DIA_7', 'SEGUIMIENTO_DIA_14', 'PERSONALIZADA');

-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "etapaCRM" "EtapaCRM",
ADD COLUMN     "motivoPerdida" "MotivoPerdidaCRM",
ADD COLUMN     "notasComerciales" TEXT,
ADD COLUMN     "scoreConversion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "temperatura" "TemperaturaPaciente";

-- CreateTable
CREATE TABLE "TareaSeguimiento" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "tipo" "TipoTareaSeguimiento" NOT NULL,
    "fechaProgramada" TIMESTAMP(3) NOT NULL,
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "completadaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TareaSeguimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TareaSeguimiento_pacienteId_idx" ON "TareaSeguimiento"("pacienteId");

-- CreateIndex
CREATE INDEX "TareaSeguimiento_profesionalId_completada_fechaProgramada_idx" ON "TareaSeguimiento"("profesionalId", "completada", "fechaProgramada");

-- CreateIndex
CREATE INDEX "Paciente_etapaCRM_idx" ON "Paciente"("etapaCRM");

-- CreateIndex
CREATE INDEX "Paciente_profesionalId_etapaCRM_idx" ON "Paciente"("profesionalId", "etapaCRM");

-- AddForeignKey
ALTER TABLE "TareaSeguimiento" ADD CONSTRAINT "TareaSeguimiento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaSeguimiento" ADD CONSTRAINT "TareaSeguimiento_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

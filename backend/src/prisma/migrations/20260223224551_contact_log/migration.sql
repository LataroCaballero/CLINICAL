-- CreateEnum
CREATE TYPE "TipoContacto" AS ENUM ('LLAMADA', 'MENSAJE', 'PRESENCIAL');

-- CreateTable
CREATE TABLE "ContactoLog" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "tipo" "TipoContacto" NOT NULL,
    "nota" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etapaCRMPost" "EtapaCRM",
    "temperaturaPost" "TemperaturaPaciente",
    "proximaAccionFecha" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactoLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactoLog_pacienteId_fecha_idx" ON "ContactoLog"("pacienteId", "fecha");

-- CreateIndex
CREATE INDEX "ContactoLog_profesionalId_fecha_idx" ON "ContactoLog"("profesionalId", "fecha");

-- AddForeignKey
ALTER TABLE "ContactoLog" ADD CONSTRAINT "ContactoLog_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactoLog" ADD CONSTRAINT "ContactoLog_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

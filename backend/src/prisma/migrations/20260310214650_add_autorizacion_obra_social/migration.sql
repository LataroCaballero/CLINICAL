-- CreateEnum
CREATE TYPE "EstadoAutorizacion" AS ENUM ('PENDIENTE', 'AUTORIZADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "AutorizacionObraSocial" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "obraSocialId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "codigos" JSONB NOT NULL,
    "estado" "EstadoAutorizacion" NOT NULL DEFAULT 'PENDIENTE',
    "notaSecretaria" TEXT,
    "fechaAutorizacion" TIMESTAMP(3),
    "autorizadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutorizacionObraSocial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutorizacionObraSocial_pacienteId_idx" ON "AutorizacionObraSocial"("pacienteId");

-- CreateIndex
CREATE INDEX "AutorizacionObraSocial_estado_idx" ON "AutorizacionObraSocial"("estado");

-- CreateIndex
CREATE INDEX "AutorizacionObraSocial_profesionalId_estado_idx" ON "AutorizacionObraSocial"("profesionalId", "estado");

-- AddForeignKey
ALTER TABLE "AutorizacionObraSocial" ADD CONSTRAINT "AutorizacionObraSocial_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutorizacionObraSocial" ADD CONSTRAINT "AutorizacionObraSocial_obraSocialId_fkey" FOREIGN KEY ("obraSocialId") REFERENCES "ObraSocial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutorizacionObraSocial" ADD CONSTRAINT "AutorizacionObraSocial_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutorizacionObraSocial" ADD CONSTRAINT "AutorizacionObraSocial_autorizadoPorId_fkey" FOREIGN KEY ("autorizadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "EstadoMensajeWA" AS ENUM ('PENDIENTE', 'ENVIADO', 'ENTREGADO', 'LEIDO', 'FALLIDO');

-- CreateEnum
CREATE TYPE "TipoMensajeWA" AS ENUM ('PRESUPUESTO', 'RECORDATORIO_TURNO', 'SEGUIMIENTO', 'CUSTOM');

-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappOptInAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ConfiguracionWABA" (
    "id" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "wabaId" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "displayPhone" TEXT NOT NULL,
    "verifiedName" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionWABA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensajeWhatsApp" (
    "id" TEXT NOT NULL,
    "waMessageId" TEXT,
    "pacienteId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "tipo" "TipoMensajeWA" NOT NULL,
    "contenido" TEXT,
    "estado" "EstadoMensajeWA" NOT NULL DEFAULT 'PENDIENTE',
    "errorMsg" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MensajeWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionWABA_profesionalId_key" ON "ConfiguracionWABA"("profesionalId");

-- CreateIndex
CREATE INDEX "MensajeWhatsApp_pacienteId_createdAt_idx" ON "MensajeWhatsApp"("pacienteId", "createdAt");

-- CreateIndex
CREATE INDEX "MensajeWhatsApp_estado_idx" ON "MensajeWhatsApp"("estado");

-- CreateIndex
CREATE INDEX "MensajeWhatsApp_waMessageId_idx" ON "MensajeWhatsApp"("waMessageId");

-- AddForeignKey
ALTER TABLE "ConfiguracionWABA" ADD CONSTRAINT "ConfiguracionWABA_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeWhatsApp" ADD CONSTRAINT "MensajeWhatsApp_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeWhatsApp" ADD CONSTRAINT "MensajeWhatsApp_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "TipoReporteEmail" AS ENUM ('RESUMEN_SEMANAL', 'RESUMEN_MENSUAL', 'INGRESOS', 'TURNOS', 'MOROSIDAD');

-- CreateEnum
CREATE TYPE "FrecuenciaReporte" AS ENUM ('SEMANAL', 'MENSUAL');

-- CreateTable
CREATE TABLE "ReporteSuscripcion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipoReporte" "TipoReporteEmail" NOT NULL,
    "frecuencia" "FrecuenciaReporte" NOT NULL,
    "emailDestino" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoEnvio" TIMESTAMP(3),
    "proximoEnvio" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReporteSuscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReporteSuscripcion_proximoEnvio_activo_idx" ON "ReporteSuscripcion"("proximoEnvio", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "ReporteSuscripcion_usuarioId_tipoReporte_key" ON "ReporteSuscripcion"("usuarioId", "tipoReporte");

-- AddForeignKey
ALTER TABLE "ReporteSuscripcion" ADD CONSTRAINT "ReporteSuscripcion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

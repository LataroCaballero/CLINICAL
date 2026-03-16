-- CreateEnum
CREATE TYPE "AmbienteAFIP" AS ENUM ('HOMOLOGACION', 'PRODUCCION');

-- AlterEnum
ALTER TYPE "EstadoFactura" ADD VALUE 'CAEA_PENDIENTE_INFORMAR';

-- AlterTable
ALTER TABLE "Factura" ADD COLUMN     "cae" TEXT,
ADD COLUMN     "caeFchVto" TEXT,
ADD COLUMN     "nroComprobante" INTEGER,
ADD COLUMN     "ptoVta" INTEGER,
ADD COLUMN     "qrData" TEXT,
ALTER COLUMN "condicionIVAReceptor" SET DEFAULT 'CONSUMIDOR_FINAL',
ALTER COLUMN "tipoCambio" SET DEFAULT 1.0,
ALTER COLUMN "moneda" SET DEFAULT 'ARS';

-- CreateTable
CREATE TABLE "ConfiguracionAFIP" (
    "id" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "certPemEncrypted" TEXT NOT NULL,
    "keyPemEncrypted" TEXT NOT NULL,
    "certExpiresAt" TIMESTAMP(3) NOT NULL,
    "ptoVta" INTEGER NOT NULL,
    "ambiente" "AmbienteAFIP" NOT NULL DEFAULT 'HOMOLOGACION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionAFIP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaeaVigente" (
    "id" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "caea" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "fchVigDesde" TEXT NOT NULL,
    "fchVigHasta" TEXT NOT NULL,
    "fchTopeInf" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaeaVigente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionAFIP_profesionalId_key" ON "ConfiguracionAFIP"("profesionalId");

-- CreateIndex
CREATE INDEX "CaeaVigente_profesionalId_fchVigHasta_idx" ON "CaeaVigente"("profesionalId", "fchVigHasta");

-- CreateIndex
CREATE UNIQUE INDEX "CaeaVigente_profesionalId_periodo_orden_key" ON "CaeaVigente"("profesionalId", "periodo", "orden");

-- AddForeignKey
ALTER TABLE "ConfiguracionAFIP" ADD CONSTRAINT "ConfiguracionAFIP_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaeaVigente" ADD CONSTRAINT "CaeaVigente_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

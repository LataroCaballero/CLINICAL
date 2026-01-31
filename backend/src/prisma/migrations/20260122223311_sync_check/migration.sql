-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'MERCADO_PAGO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoFactura" AS ENUM ('EMITIDA', 'ANULADA');

-- AlterTable
ALTER TABLE "Factura" ADD COLUMN     "concepto" TEXT,
ADD COLUMN     "condicionIVA" TEXT,
ADD COLUMN     "estado" "EstadoFactura" NOT NULL DEFAULT 'EMITIDA',
ADD COLUMN     "obraSocialId" TEXT,
ADD COLUMN     "pacienteId" TEXT;

-- AlterTable
ALTER TABLE "MovimientoCC" ADD COLUMN     "anulado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaAnulacion" TIMESTAMP(3),
ADD COLUMN     "medioPago" "MedioPago",
ADD COLUMN     "referencia" TEXT,
ADD COLUMN     "usuarioId" TEXT;

-- CreateIndex
CREATE INDEX "Factura_profesionalId_fecha_idx" ON "Factura"("profesionalId", "fecha");

-- CreateIndex
CREATE INDEX "Factura_estado_idx" ON "Factura"("estado");

-- CreateIndex
CREATE INDEX "MovimientoCC_cuentaCorrienteId_fecha_idx" ON "MovimientoCC"("cuentaCorrienteId", "fecha");

-- CreateIndex
CREATE INDEX "MovimientoCC_tipo_fecha_idx" ON "MovimientoCC"("tipo", "fecha");

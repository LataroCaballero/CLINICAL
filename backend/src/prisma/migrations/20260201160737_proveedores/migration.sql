-- CreateEnum
CREATE TYPE "CondicionPagoProveedor" AS ENUM ('CONTADO', 'DIAS_30', 'DIAS_60', 'DIAS_90', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "EstadoCuota" AS ENUM ('PENDIENTE', 'PAGADA', 'VENCIDA', 'ANULADA');

-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "cantidadCuotas" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "condicionPago" "CondicionPagoProveedor" NOT NULL DEFAULT 'CONTADO',
ADD COLUMN     "fechaPrimerVencimiento" TIMESTAMP(3),
ADD COLUMN     "total" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "CuentaCorrienteProveedor" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "saldoActual" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "totalPagadoHistorico" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuentaCorrienteProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoCCProveedor" (
    "id" TEXT NOT NULL,
    "cuentaCorrienteProveedorId" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "medioPago" "MedioPago",
    "descripcion" TEXT,
    "referencia" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "fechaAnulacion" TIMESTAMP(3),
    "ordenCompraId" TEXT,
    "cuotaId" TEXT,
    "usuarioId" TEXT,

    CONSTRAINT "MovimientoCCProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuotaOrdenCompra" (
    "id" TEXT NOT NULL,
    "ordenCompraId" TEXT NOT NULL,
    "numeroCuota" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoCuota" NOT NULL DEFAULT 'PENDIENTE',
    "fechaPago" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuotaOrdenCompra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CuentaCorrienteProveedor_proveedorId_key" ON "CuentaCorrienteProveedor"("proveedorId");

-- CreateIndex
CREATE INDEX "CuentaCorrienteProveedor_profesionalId_idx" ON "CuentaCorrienteProveedor"("profesionalId");

-- CreateIndex
CREATE UNIQUE INDEX "MovimientoCCProveedor_cuotaId_key" ON "MovimientoCCProveedor"("cuotaId");

-- CreateIndex
CREATE INDEX "MovimientoCCProveedor_cuentaCorrienteProveedorId_fecha_idx" ON "MovimientoCCProveedor"("cuentaCorrienteProveedorId", "fecha");

-- CreateIndex
CREATE INDEX "MovimientoCCProveedor_tipo_fecha_idx" ON "MovimientoCCProveedor"("tipo", "fecha");

-- CreateIndex
CREATE INDEX "CuotaOrdenCompra_estado_fechaVencimiento_idx" ON "CuotaOrdenCompra"("estado", "fechaVencimiento");

-- CreateIndex
CREATE UNIQUE INDEX "CuotaOrdenCompra_ordenCompraId_numeroCuota_key" ON "CuotaOrdenCompra"("ordenCompraId", "numeroCuota");

-- AddForeignKey
ALTER TABLE "CuentaCorrienteProveedor" ADD CONSTRAINT "CuentaCorrienteProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCCProveedor" ADD CONSTRAINT "MovimientoCCProveedor_cuentaCorrienteProveedorId_fkey" FOREIGN KEY ("cuentaCorrienteProveedorId") REFERENCES "CuentaCorrienteProveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCCProveedor" ADD CONSTRAINT "MovimientoCCProveedor_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCCProveedor" ADD CONSTRAINT "MovimientoCCProveedor_cuotaId_fkey" FOREIGN KEY ("cuotaId") REFERENCES "CuotaOrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuotaOrdenCompra" ADD CONSTRAINT "CuotaOrdenCompra_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Baseline migration.
--
-- Los modelos OrdenConsumo / OrdenConsumoInsumo / EstadoOrdenConsumo se agregaron a
-- schema.prisma en f04c782 (fase 27-01) y se aplicaron a la base con `prisma db push`,
-- que no deja registro en el historial de migraciones. Resultado: existian en la base
-- viva pero ninguna migracion los creaba, y `prisma migrate dev` lo reportaba como drift.
--
-- Este archivo reconstruye ese DDL a partir del estado real de la base
-- (`prisma migrate diff --from-empty --to-schema-datasource`) y se registra con
-- `prisma migrate resolve --applied 20260709000000_baseline_orden_consumo`, sin ejecutarse
-- contra la base existente. Solo corre en reconstrucciones desde cero.

-- CreateEnum
CREATE TYPE "EstadoOrdenConsumo" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "OrdenConsumo" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "turnoId" TEXT,
    "historiaClinicaEntradaId" TEXT NOT NULL,
    "fechaSesion" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoOrdenConsumo" NOT NULL DEFAULT 'PENDIENTE',
    "tratamientosSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdenConsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenConsumoInsumo" (
    "id" TEXT NOT NULL,
    "ordenConsumoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "OrdenConsumoInsumo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrdenConsumo_pacienteId_idx" ON "OrdenConsumo"("pacienteId");

-- CreateIndex
CREATE INDEX "OrdenConsumo_profesionalId_estado_idx" ON "OrdenConsumo"("profesionalId", "estado");

-- CreateIndex
CREATE INDEX "OrdenConsumoInsumo_ordenConsumoId_idx" ON "OrdenConsumoInsumo"("ordenConsumoId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenConsumoInsumo_ordenConsumoId_productoId_key" ON "OrdenConsumoInsumo"("ordenConsumoId", "productoId");

-- AddForeignKey
ALTER TABLE "OrdenConsumo" ADD CONSTRAINT "OrdenConsumo_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenConsumo" ADD CONSTRAINT "OrdenConsumo_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenConsumoInsumo" ADD CONSTRAINT "OrdenConsumoInsumo_ordenConsumoId_fkey" FOREIGN KEY ("ordenConsumoId") REFERENCES "OrdenConsumo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenConsumoInsumo" ADD CONSTRAINT "OrdenConsumoInsumo_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

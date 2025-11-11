/*
  Warnings:

  - You are about to drop the column `archivoId` on the `RegistroClinico` table. All the data in the column will be lost.
  - The `tipo` column on the `RegistroClinico` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[ventaId]` on the table `Pago` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `creadoPorId` to the `RegistroClinico` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `RegistroClinico` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoRegistro" AS ENUM ('HISTORIA', 'PRACTICA', 'EVOLUCION', 'ESTUDIO');

-- CreateEnum
CREATE TYPE "TipoPlantilla" AS ENUM ('PRACTICA', 'EVOLUCION', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoLiquidacion" AS ENUM ('PENDIENTE', 'PAGADA');

-- AlterEnum
ALTER TYPE "TipoRol" ADD VALUE 'FACTURADOR';

-- DropForeignKey
ALTER TABLE "public"."RegistroClinico" DROP CONSTRAINT "RegistroClinico_archivoId_fkey";

-- AlterTable
ALTER TABLE "Insumo" ADD COLUMN     "aLaVenta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "precioVenta" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Pago" ADD COLUMN     "concepto" TEXT,
ADD COLUMN     "presupuestoId" TEXT,
ADD COLUMN     "turnoId" TEXT,
ADD COLUMN     "ventaId" TEXT;

-- AlterTable
ALTER TABLE "RegistroClinico" DROP COLUMN "archivoId",
ADD COLUMN     "creadoPorId" TEXT NOT NULL,
ADD COLUMN     "liquidacionId" TEXT,
ADD COLUMN     "plantillaId" TEXT,
ADD COLUMN     "practicaId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "contenido" DROP NOT NULL,
DROP COLUMN "tipo",
ADD COLUMN     "tipo" "TipoRegistro" NOT NULL DEFAULT 'HISTORIA';

-- CreateTable
CREATE TABLE "Plantilla" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "camposJSON" JSONB NOT NULL,
    "tipo" "TipoPlantilla" NOT NULL DEFAULT 'PRACTICA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plantilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Practica" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "obraSocialId" TEXT,
    "plantillaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Practica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudAccesoHistoria" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "secretariaId" TEXT,
    "profesionalId" TEXT NOT NULL,
    "historiaClinicaId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "motivo" TEXT,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaResolucion" TIMESTAMP(3),
    "expiracionAcceso" TIMESTAMP(3),

    CONSTRAINT "SolicitudAccesoHistoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidacionPractica" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pacienteId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "obraSocialId" TEXT NOT NULL,
    "practicaId" TEXT NOT NULL,
    "registroId" TEXT,
    "monto" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoLiquidacion" NOT NULL DEFAULT 'PENDIENTE',
    "fechaPago" TIMESTAMP(3),
    "comprobante" TEXT,
    "creadaPorId" TEXT NOT NULL,
    "pagadaPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "comprobanteFacturacionId" TEXT,

    CONSTRAINT "LiquidacionPractica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComprobanteFacturacion" (
    "id" TEXT NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "obraSocialId" TEXT,
    "tipo" TEXT NOT NULL,
    "numero" TEXT,
    "montoTotal" DECIMAL(10,2) NOT NULL,
    "montoFacturado" DECIMAL(10,2) NOT NULL,
    "montoPendiente" DECIMAL(10,2) NOT NULL,
    "generadoPorId" TEXT NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComprobanteFacturacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatosFiscalesObraSocial" (
    "id" TEXT NOT NULL,
    "obraSocialId" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "condicionIVA" TEXT NOT NULL,
    "direccion" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatosFiscalesObraSocial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DECIMAL(10,2) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "pacienteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaLinea" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "VentaLinea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RegistroArchivo" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RegistroArchivo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiquidacionPractica_registroId_key" ON "LiquidacionPractica"("registroId");

-- CreateIndex
CREATE INDEX "VentaLinea_ventaId_idx" ON "VentaLinea"("ventaId");

-- CreateIndex
CREATE INDEX "VentaLinea_insumoId_idx" ON "VentaLinea"("insumoId");

-- CreateIndex
CREATE INDEX "_RegistroArchivo_B_index" ON "_RegistroArchivo"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_ventaId_key" ON "Pago"("ventaId");

-- CreateIndex
CREATE INDEX "Pago_turnoId_idx" ON "Pago"("turnoId");

-- CreateIndex
CREATE INDEX "Pago_presupuestoId_idx" ON "Pago"("presupuestoId");

-- CreateIndex
CREATE INDEX "Pago_ventaId_idx" ON "Pago"("ventaId");

-- AddForeignKey
ALTER TABLE "RegistroClinico" ADD CONSTRAINT "RegistroClinico_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroClinico" ADD CONSTRAINT "RegistroClinico_practicaId_fkey" FOREIGN KEY ("practicaId") REFERENCES "Practica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroClinico" ADD CONSTRAINT "RegistroClinico_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Practica" ADD CONSTRAINT "Practica_obraSocialId_fkey" FOREIGN KEY ("obraSocialId") REFERENCES "ObraSocial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Practica" ADD CONSTRAINT "Practica_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudAccesoHistoria" ADD CONSTRAINT "SolicitudAccesoHistoria_historiaClinicaId_fkey" FOREIGN KEY ("historiaClinicaId") REFERENCES "HistoriaClinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudAccesoHistoria" ADD CONSTRAINT "SolicitudAccesoHistoria_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudAccesoHistoria" ADD CONSTRAINT "SolicitudAccesoHistoria_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudAccesoHistoria" ADD CONSTRAINT "SolicitudAccesoHistoria_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionPractica" ADD CONSTRAINT "LiquidacionPractica_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionPractica" ADD CONSTRAINT "LiquidacionPractica_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionPractica" ADD CONSTRAINT "LiquidacionPractica_obraSocialId_fkey" FOREIGN KEY ("obraSocialId") REFERENCES "ObraSocial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionPractica" ADD CONSTRAINT "LiquidacionPractica_practicaId_fkey" FOREIGN KEY ("practicaId") REFERENCES "Practica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionPractica" ADD CONSTRAINT "LiquidacionPractica_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "RegistroClinico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionPractica" ADD CONSTRAINT "LiquidacionPractica_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionPractica" ADD CONSTRAINT "LiquidacionPractica_pagadaPorId_fkey" FOREIGN KEY ("pagadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionPractica" ADD CONSTRAINT "LiquidacionPractica_comprobanteFacturacionId_fkey" FOREIGN KEY ("comprobanteFacturacionId") REFERENCES "ComprobanteFacturacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobanteFacturacion" ADD CONSTRAINT "ComprobanteFacturacion_obraSocialId_fkey" FOREIGN KEY ("obraSocialId") REFERENCES "ObraSocial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobanteFacturacion" ADD CONSTRAINT "ComprobanteFacturacion_generadoPorId_fkey" FOREIGN KEY ("generadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatosFiscalesObraSocial" ADD CONSTRAINT "DatosFiscalesObraSocial_obraSocialId_fkey" FOREIGN KEY ("obraSocialId") REFERENCES "ObraSocial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaLinea" ADD CONSTRAINT "VentaLinea_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaLinea" ADD CONSTRAINT "VentaLinea_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RegistroArchivo" ADD CONSTRAINT "_RegistroArchivo_A_fkey" FOREIGN KEY ("A") REFERENCES "Archivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RegistroArchivo" ADD CONSTRAINT "_RegistroArchivo_B_fkey" FOREIGN KEY ("B") REFERENCES "RegistroClinico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

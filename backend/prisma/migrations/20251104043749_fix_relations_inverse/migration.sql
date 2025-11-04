/*
  Warnings:

  - Added the required column `creadaPorId` to the `ObraSocial` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profesionalId` to the `Pago` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoRol" AS ENUM ('ADMIN', 'PROFESIONAL', 'SECRETARIA', 'PACIENTE');

-- AlterTable
ALTER TABLE "Insumo" ADD COLUMN     "profesionalId" TEXT;

-- AlterTable
ALTER TABLE "ObraSocial" ADD COLUMN     "actualizadaPorId" TEXT,
ADD COLUMN     "creadaPorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Pago" ADD COLUMN     "creadoPorId" TEXT,
ADD COLUMN     "profesionalId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "tipoRol" "TipoRol" NOT NULL DEFAULT 'PACIENTE';

-- CreateTable
CREATE TABLE "SecretariaProfesional" (
    "id" TEXT NOT NULL,
    "secretariaId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,

    CONSTRAINT "SecretariaProfesional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecretariaProfesional_secretariaId_profesionalId_key" ON "SecretariaProfesional"("secretariaId", "profesionalId");

-- CreateIndex
CREATE INDEX "Insumo_profesionalId_idx" ON "Insumo"("profesionalId");

-- CreateIndex
CREATE INDEX "Pago_profesionalId_idx" ON "Pago"("profesionalId");

-- CreateIndex
CREATE INDEX "Pago_creadoPorId_idx" ON "Pago"("creadoPorId");

-- AddForeignKey
ALTER TABLE "SecretariaProfesional" ADD CONSTRAINT "SecretariaProfesional_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretariaProfesional" ADD CONSTRAINT "SecretariaProfesional_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObraSocial" ADD CONSTRAINT "ObraSocial_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObraSocial" ADD CONSTRAINT "ObraSocial_actualizadaPorId_fkey" FOREIGN KEY ("actualizadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insumo" ADD CONSTRAINT "Insumo_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

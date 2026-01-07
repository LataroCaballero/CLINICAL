-- CreateEnum
CREATE TYPE "EstadoPlantillaHC" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EstadoEntradaHC" AS ENUM ('DRAFT', 'FINALIZED');

-- AlterTable
ALTER TABLE "HistoriaClinicaEntrada" ADD COLUMN     "answers" JSONB,
ADD COLUMN     "computed" JSONB,
ADD COLUMN     "status" "EstadoEntradaHC" NOT NULL DEFAULT 'FINALIZED',
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "templateVersionId" TEXT;

-- CreateTable
CREATE TABLE "HistoriaClinicaTemplate" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "profesionalId" TEXT NOT NULL,
    "estado" "EstadoPlantillaHC" NOT NULL DEFAULT 'DRAFT',
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoriaClinicaTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriaClinicaTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "schema" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriaClinicaTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HistoriaClinicaTemplate_currentVersionId_key" ON "HistoriaClinicaTemplate"("currentVersionId");

-- CreateIndex
CREATE INDEX "HistoriaClinicaTemplate_profesionalId_estado_idx" ON "HistoriaClinicaTemplate"("profesionalId", "estado");

-- CreateIndex
CREATE INDEX "HistoriaClinicaTemplateVersion_templateId_idx" ON "HistoriaClinicaTemplateVersion"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "HistoriaClinicaTemplateVersion_templateId_version_key" ON "HistoriaClinicaTemplateVersion"("templateId", "version");

-- CreateIndex
CREATE INDEX "HistoriaClinicaEntrada_templateId_idx" ON "HistoriaClinicaEntrada"("templateId");

-- CreateIndex
CREATE INDEX "HistoriaClinicaEntrada_status_idx" ON "HistoriaClinicaEntrada"("status");

-- AddForeignKey
ALTER TABLE "HistoriaClinicaEntrada" ADD CONSTRAINT "HistoriaClinicaEntrada_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "HistoriaClinicaTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriaClinicaEntrada" ADD CONSTRAINT "HistoriaClinicaEntrada_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "HistoriaClinicaTemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriaClinicaTemplate" ADD CONSTRAINT "HistoriaClinicaTemplate_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriaClinicaTemplate" ADD CONSTRAINT "HistoriaClinicaTemplate_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "HistoriaClinicaTemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriaClinicaTemplateVersion" ADD CONSTRAINT "HistoriaClinicaTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "HistoriaClinicaTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

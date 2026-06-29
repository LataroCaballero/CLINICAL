-- AlterTable
ALTER TABLE "CirugiaCatalogo" ADD COLUMN     "zonaId" TEXT;

-- AlterTable
ALTER TABLE "ZonaHC" ADD COLUMN     "indicacionesUrl" TEXT;

-- CreateTable
CREATE TABLE "ConsentimientoZonaArchivo" (
    "id" TEXT NOT NULL,
    "zonaId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "nombreOriginal" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigente" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ConsentimientoZonaArchivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentimientoZonaArchivo_zonaId_vigente_idx" ON "ConsentimientoZonaArchivo"("zonaId", "vigente");

-- CreateIndex
CREATE INDEX "ConsentimientoZonaArchivo_profesionalId_idx" ON "ConsentimientoZonaArchivo"("profesionalId");

-- CreateIndex
CREATE INDEX "CirugiaCatalogo_zonaId_idx" ON "CirugiaCatalogo"("zonaId");

-- AddForeignKey
ALTER TABLE "CirugiaCatalogo" ADD CONSTRAINT "CirugiaCatalogo_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "ZonaHC"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentimientoZonaArchivo" ADD CONSTRAINT "ConsentimientoZonaArchivo_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "ZonaHC"("id") ON DELETE CASCADE ON UPDATE CASCADE;

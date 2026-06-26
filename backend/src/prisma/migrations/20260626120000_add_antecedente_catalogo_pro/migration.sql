-- CreateTable
CREATE TABLE "AntecedenteCatalogoPro" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "esSistema" BOOLEAN NOT NULL DEFAULT false,
    "profesionalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AntecedenteCatalogoPro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AntecedenteCatalogoPro_profesionalId_activo_idx" ON "AntecedenteCatalogoPro"("profesionalId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "AntecedenteCatalogoPro_nombre_profesionalId_key" ON "AntecedenteCatalogoPro"("nombre", "profesionalId");

-- AddForeignKey
ALTER TABLE "AntecedenteCatalogoPro" ADD CONSTRAINT "AntecedenteCatalogoPro_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

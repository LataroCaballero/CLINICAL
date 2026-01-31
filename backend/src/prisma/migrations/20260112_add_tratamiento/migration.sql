-- CreateTable Tratamiento (ejecutar manualmente)
CREATE TABLE IF NOT EXISTS "Tratamiento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "indicaciones" TEXT,
    "procedimiento" TEXT,
    "duracionMinutos" INTEGER,
    "profesionalId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tratamiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Tratamiento_nombre_profesionalId_key" ON "Tratamiento"("nombre", "profesionalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Tratamiento_profesionalId_activo_idx" ON "Tratamiento"("profesionalId", "activo");

-- AddForeignKey
ALTER TABLE "Tratamiento" ADD CONSTRAINT "Tratamiento_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

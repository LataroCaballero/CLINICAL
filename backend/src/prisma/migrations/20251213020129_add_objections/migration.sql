-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "objecionId" TEXT;

-- CreateTable
CREATE TABLE "Objection" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Objection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Objection_nombre_key" ON "Objection"("nombre");

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_objecionId_fkey" FOREIGN KEY ("objecionId") REFERENCES "Objection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

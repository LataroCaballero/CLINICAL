-- AlterEnum
ALTER TYPE "EstadoPresupuesto" ADD VALUE 'VENCIDO';

-- AlterTable: Add new columns to Presupuesto
ALTER TABLE "Presupuesto" ADD COLUMN "fechaValidez" TIMESTAMP(3),
ADD COLUMN "moneda" TEXT NOT NULL DEFAULT 'ARS',
ADD COLUMN "tokenAceptacion" TEXT;

-- AlterTable: PresupuestoItem — add precioTotal (nullable first), copy from total, drop old columns, then set NOT NULL
ALTER TABLE "PresupuestoItem" ADD COLUMN "precioTotal" DECIMAL(10,2);
UPDATE "PresupuestoItem" SET "precioTotal" = "total";
ALTER TABLE "PresupuestoItem" DROP COLUMN "cantidad";
ALTER TABLE "PresupuestoItem" DROP COLUMN "precioUnitario";
ALTER TABLE "PresupuestoItem" DROP COLUMN "total";
ALTER TABLE "PresupuestoItem" ALTER COLUMN "precioTotal" SET NOT NULL;

-- CreateTable: ConfigClinica
CREATE TABLE "ConfigClinica" (
    "id" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "nombreClinica" TEXT,
    "logoUrl" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "emailContacto" TEXT,
    "web" TEXT,
    "piePaginaTexto" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPassEncrypted" TEXT,
    "smtpFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigClinica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfigClinica_profesionalId_key" ON "ConfigClinica"("profesionalId");

-- CreateIndex
CREATE UNIQUE INDEX "Presupuesto_tokenAceptacion_key" ON "Presupuesto"("tokenAceptacion");

-- AddForeignKey
ALTER TABLE "ConfigClinica" ADD CONSTRAINT "ConfigClinica_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

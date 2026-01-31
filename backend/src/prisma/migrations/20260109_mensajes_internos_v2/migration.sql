-- CreateEnum
CREATE TYPE "PrioridadMensaje" AS ENUM ('ALTA', 'MEDIA', 'BAJA');

-- AlterTable: Add new columns first
ALTER TABLE "MensajeInterno" ADD COLUMN "prioridad" "PrioridadMensaje" NOT NULL DEFAULT 'MEDIA';
ALTER TABLE "MensajeInterno" ADD COLUMN "autorId" TEXT;
ALTER TABLE "MensajeInterno" ADD COLUMN "createdAt" TIMESTAMP(3);

-- Copy data from old columns to new columns
UPDATE "MensajeInterno" SET "autorId" = "autorUserId" WHERE "autorUserId" IS NOT NULL;
UPDATE "MensajeInterno" SET "createdAt" = "timestamp" WHERE "timestamp" IS NOT NULL;

-- Set default for createdAt if null
UPDATE "MensajeInterno" SET "createdAt" = NOW() WHERE "createdAt" IS NULL;

-- Delete orphan messages (where autorId doesn't exist in Usuario)
DELETE FROM "MensajeInterno" WHERE "autorId" NOT IN (SELECT "id" FROM "Usuario");

-- Make autorId required now that data is copied and cleaned
ALTER TABLE "MensajeInterno" ALTER COLUMN "autorId" SET NOT NULL;
ALTER TABLE "MensajeInterno" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "MensajeInterno" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Drop old columns
ALTER TABLE "MensajeInterno" DROP COLUMN "autorUserId";
ALTER TABLE "MensajeInterno" DROP COLUMN "timestamp";

-- CreateTable
CREATE TABLE "MensajeLectura" (
    "id" TEXT NOT NULL,
    "mensajeId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "leidoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensajeLectura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MensajeInterno_pacienteId_createdAt_idx" ON "MensajeInterno"("pacienteId", "createdAt");

-- CreateIndex
CREATE INDEX "MensajeInterno_autorId_idx" ON "MensajeInterno"("autorId");

-- CreateIndex
CREATE INDEX "MensajeLectura_usuarioId_idx" ON "MensajeLectura"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "MensajeLectura_mensajeId_usuarioId_key" ON "MensajeLectura"("mensajeId", "usuarioId");

-- AddForeignKey
ALTER TABLE "MensajeInterno" ADD CONSTRAINT "MensajeInterno_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeLectura" ADD CONSTRAINT "MensajeLectura_mensajeId_fkey" FOREIGN KEY ("mensajeId") REFERENCES "MensajeInterno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeLectura" ADD CONSTRAINT "MensajeLectura_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

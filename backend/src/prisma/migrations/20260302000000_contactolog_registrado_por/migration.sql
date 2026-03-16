-- AlterTable
ALTER TABLE "ContactoLog" ADD COLUMN "registradoPorId" TEXT;

-- AddForeignKey
ALTER TABLE "ContactoLog" ADD CONSTRAINT "ContactoLog_registradoPorId_fkey"
  FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

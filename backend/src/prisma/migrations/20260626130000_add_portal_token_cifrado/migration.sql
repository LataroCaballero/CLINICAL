-- AlterTable: add encrypted portal token column (additive-only, nullable — amplía D-12)
-- Raw portal token stored AES-256-GCM; lookup continues via portalToken (SHA-256 hash)
ALTER TABLE "Paciente" ADD COLUMN "portalTokenCifrado" TEXT;

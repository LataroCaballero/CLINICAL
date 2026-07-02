-- Phase 56 — Signed Consent Forensic Foundation
-- Additive-only migration: ADD COLUMN + CREATE TABLE (no locks on hot paths, T-56-03)
--
-- Delta 1: Add version column to ConsentimientoZonaArchivo (D-03)
ALTER TABLE "ConsentimientoZonaArchivo"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Backfill: assign incremental version per zona ordered by uploadedAt
-- Uses ROW_NUMBER() window function — bounded to existing rows only (T-56-03)
WITH versioned AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "zonaId"
           ORDER BY "uploadedAt" ASC
         ) AS v
  FROM "ConsentimientoZonaArchivo"
)
UPDATE "ConsentimientoZonaArchivo" czm
SET version = versioned.v
FROM versioned
WHERE czm.id = versioned.id;

-- Delta 2: Create ConsentimientoFirmado forensic model (D-04)
-- onDelete: Restrict on consentimientoZonaArchivoId enforces write-once immutability (T-56-01)
CREATE TABLE "ConsentimientoFirmado" (
    "id"                          TEXT NOT NULL,
    "pacienteId"                  TEXT NOT NULL,
    "zonaId"                      TEXT NOT NULL,
    "consentimientoZonaArchivoId" TEXT NOT NULL,
    "pdfFirmadoPath"              TEXT NOT NULL,
    "ip"                          TEXT NOT NULL,
    "userAgent"                   TEXT NOT NULL,
    "versionNumero"               INTEGER NOT NULL,
    "hashSha256"                  TEXT NOT NULL,
    "firmadoAt"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indicacionesLeidasAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentimientoFirmado_pkey" PRIMARY KEY ("id")
);

-- Foreign keys for ConsentimientoFirmado
ALTER TABLE "ConsentimientoFirmado"
  ADD CONSTRAINT "ConsentimientoFirmado_pacienteId_fkey"
    FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConsentimientoFirmado"
  ADD CONSTRAINT "ConsentimientoFirmado_zonaId_fkey"
    FOREIGN KEY ("zonaId") REFERENCES "ZonaHC"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConsentimientoFirmado"
  ADD CONSTRAINT "ConsentimientoFirmado_consentimientoZonaArchivoId_fkey"
    FOREIGN KEY ("consentimientoZonaArchivoId") REFERENCES "ConsentimientoZonaArchivo"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes for ConsentimientoFirmado
CREATE INDEX "ConsentimientoFirmado_pacienteId_idx" ON "ConsentimientoFirmado"("pacienteId");
CREATE INDEX "ConsentimientoFirmado_zonaId_idx" ON "ConsentimientoFirmado"("zonaId");
CREATE INDEX "ConsentimientoFirmado_pacienteId_zonaId_idx" ON "ConsentimientoFirmado"("pacienteId", "zonaId");

-- Delta 3: Add cirugiaCatalogoId FK to Cirugia (D-09 consent-resolution chain)
-- Nullable: existing rows get cirugiaCatalogoId = NULL (D-10 empty-state handled downstream)
ALTER TABLE "Cirugia"
  ADD COLUMN "cirugiaCatalogoId" TEXT;

ALTER TABLE "Cirugia"
  ADD CONSTRAINT "Cirugia_cirugiaCatalogoId_fkey"
    FOREIGN KEY ("cirugiaCatalogoId") REFERENCES "CirugiaCatalogo"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Cirugia_cirugiaCatalogoId_idx" ON "Cirugia"("cirugiaCatalogoId");

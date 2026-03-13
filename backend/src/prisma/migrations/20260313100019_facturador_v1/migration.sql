-- Phase 8: facturador_v1 migration
-- Adds: PracticaRealizada audit fields, LimiteFacturacionMensual model,
--       Factura condicionIVAReceptor + tipoCambio + moneda (replaces condicionIVA)

-- 1. New enums
CREATE TYPE "CondicionIVA" AS ENUM (
  'RESPONSABLE_INSCRIPTO',
  'IVA_SUJETO_EXENTO',
  'CONSUMIDOR_FINAL',
  'MONOTRIBUTO',
  'SUJETO_NO_CATEGORIZADO',
  'PROVEEDOR_EXTERIOR',
  'CLIENTE_EXTERIOR',
  'IVA_LIBERADO',
  'MONOTRIBUTISTA_SOCIAL',
  'IVA_NO_ALCANZADO',
  'MONOTRIBUTO_TRABAJADOR_INDEPENDIENTE'
);

CREATE TYPE "MonedaFactura" AS ENUM ('ARS', 'USD');

-- 2. PracticaRealizada — add audit fields (all nullable, no default needed)
ALTER TABLE "PracticaRealizada"
  ADD COLUMN "montoPagado"      DECIMAL(10,2),
  ADD COLUMN "corregidoPor"     TEXT,
  ADD COLUMN "corregidoAt"      TIMESTAMP(3),
  ADD COLUMN "motivoCorreccion" TEXT;

-- 3. Factura — add new columns as nullable first
ALTER TABLE "Factura"
  ADD COLUMN "condicionIVAReceptor" "CondicionIVA",
  ADD COLUMN "tipoCambio"           DECIMAL(10,4),
  ADD COLUMN "moneda"               "MonedaFactura";

-- 4. Populate defaults for all existing Factura rows
UPDATE "Factura" SET
  "condicionIVAReceptor" = 'CONSUMIDOR_FINAL',
  "tipoCambio" = 1.0,
  "moneda" = 'ARS'
WHERE "condicionIVAReceptor" IS NULL;

-- 5. Apply NOT NULL constraints
ALTER TABLE "Factura"
  ALTER COLUMN "condicionIVAReceptor" SET NOT NULL,
  ALTER COLUMN "tipoCambio" SET NOT NULL,
  ALTER COLUMN "moneda" SET NOT NULL;

-- 6. Drop the old column (data already migrated above)
ALTER TABLE "Factura" DROP COLUMN "condicionIVA";

-- 7. New LimiteFacturacionMensual table
CREATE TABLE "LimiteFacturacionMensual" (
    "id"            TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "mes"           TEXT NOT NULL,
    "limite"        DECIMAL(10,2),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LimiteFacturacionMensual_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LimiteFacturacionMensual_profesionalId_mes_key"
  ON "LimiteFacturacionMensual"("profesionalId", "mes");

ALTER TABLE "LimiteFacturacionMensual"
  ADD CONSTRAINT "LimiteFacturacionMensual_profesionalId_fkey"
  FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

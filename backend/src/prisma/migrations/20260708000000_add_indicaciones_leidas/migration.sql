-- Phase 61 — Indicaciones acuse + consent decoupling
-- Additive/relax-only migration: ADD COLUMN + DROP NOT NULL (no locks on hot paths, T-61-03)
-- Sin indice (campo global unico).
--
-- Delta 1 (INDIC-03): add global set-once read-receipt timestamp to Paciente.
-- Metadata-only ADD COLUMN with no default — does not rewrite existing rows.
ALTER TABLE "Paciente" ADD COLUMN "indicacionesLeidasAt" TIMESTAMP(3);

-- Delta 2 (D-01): relax ConsentimientoFirmado.indicacionesLeidasAt to nullable.
--   Column is preserved (legal v1.12 forensic value); existing rows keep their
--   value untouched (no UPDATE/DELETE); new rows leave it NULL (T-61-02).
ALTER TABLE "ConsentimientoFirmado" ALTER COLUMN "indicacionesLeidasAt" DROP NOT NULL;

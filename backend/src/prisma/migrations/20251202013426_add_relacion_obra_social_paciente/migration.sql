CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- CreateIndex
CREATE INDEX "idx_paciente_dni_trgm" ON "Paciente" USING GIN ("dni" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "idx_paciente_telefono_trgm" ON "Paciente" USING GIN ("telefono" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_obraSocialId_fkey" FOREIGN KEY ("obraSocialId") REFERENCES "ObraSocial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

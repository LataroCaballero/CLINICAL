-- CreateIndex
CREATE INDEX "Turno_profesionalId_inicio_idx" ON "Turno"("profesionalId", "inicio");

-- CreateIndex
CREATE INDEX "Turno_pacienteId_inicio_idx" ON "Turno"("pacienteId", "inicio");

-- CreateIndex
CREATE INDEX "Turno_estado_idx" ON "Turno"("estado");

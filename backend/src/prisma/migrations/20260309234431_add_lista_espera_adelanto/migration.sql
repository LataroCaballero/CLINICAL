-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "comentarioListaEspera" TEXT,
ADD COLUMN     "enListaEspera" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaListaEspera" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Paciente_profesionalId_enListaEspera_idx" ON "Paciente"("profesionalId", "enListaEspera");

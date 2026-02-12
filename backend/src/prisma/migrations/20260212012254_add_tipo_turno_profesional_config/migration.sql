-- CreateTable
CREATE TABLE "TipoTurnoProfesional" (
    "id" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "tipoTurnoId" TEXT NOT NULL,
    "duracionMinutos" INTEGER,
    "colorHex" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoTurnoProfesional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TipoTurnoProfesional_profesionalId_idx" ON "TipoTurnoProfesional"("profesionalId");

-- CreateIndex
CREATE UNIQUE INDEX "TipoTurnoProfesional_profesionalId_tipoTurnoId_key" ON "TipoTurnoProfesional"("profesionalId", "tipoTurnoId");

-- AddForeignKey
ALTER TABLE "TipoTurnoProfesional" ADD CONSTRAINT "TipoTurnoProfesional_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoTurnoProfesional" ADD CONSTRAINT "TipoTurnoProfesional_tipoTurnoId_fkey" FOREIGN KEY ("tipoTurnoId") REFERENCES "TipoTurno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

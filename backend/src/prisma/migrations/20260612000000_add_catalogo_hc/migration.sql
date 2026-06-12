-- CreateTable: ZonaHC
CREATE TABLE "ZonaHC" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "esSistema" BOOLEAN NOT NULL DEFAULT false,
    "profesionalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZonaHC_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DiagnosticoHC
CREATE TABLE "DiagnosticoHC" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "esSistema" BOOLEAN NOT NULL DEFAULT false,
    "zonaId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticoHC_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TratamientoHC
CREATE TABLE "TratamientoHC" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "esSistema" BOOLEAN NOT NULL DEFAULT false,
    "zonaId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "tratamientoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TratamientoHC_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ZonaHC" ADD CONSTRAINT "ZonaHC_profesionalId_fkey"
  FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DiagnosticoHC" ADD CONSTRAINT "DiagnosticoHC_zonaId_fkey"
  FOREIGN KEY ("zonaId") REFERENCES "ZonaHC"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TratamientoHC" ADD CONSTRAINT "TratamientoHC_zonaId_fkey"
  FOREIGN KEY ("zonaId") REFERENCES "ZonaHC"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TratamientoHC" ADD CONSTRAINT "TratamientoHC_tratamientoId_fkey"
  FOREIGN KEY ("tratamientoId") REFERENCES "Tratamiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "ZonaHC_nombre_profesionalId_key" ON "ZonaHC"("nombre", "profesionalId");
CREATE INDEX "ZonaHC_profesionalId_activo_idx" ON "ZonaHC"("profesionalId", "activo");

CREATE UNIQUE INDEX "DiagnosticoHC_nombre_zonaId_key" ON "DiagnosticoHC"("nombre", "zonaId");
CREATE INDEX "DiagnosticoHC_zonaId_activo_idx" ON "DiagnosticoHC"("zonaId", "activo");
CREATE INDEX "DiagnosticoHC_profesionalId_idx" ON "DiagnosticoHC"("profesionalId");

CREATE UNIQUE INDEX "TratamientoHC_nombre_zonaId_key" ON "TratamientoHC"("nombre", "zonaId");
CREATE INDEX "TratamientoHC_zonaId_activo_idx" ON "TratamientoHC"("zonaId", "activo");
CREATE INDEX "TratamientoHC_profesionalId_idx" ON "TratamientoHC"("profesionalId");

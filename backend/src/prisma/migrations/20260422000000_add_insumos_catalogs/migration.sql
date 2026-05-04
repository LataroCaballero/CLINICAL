-- AlterTable: add precioBase to Tratamiento
ALTER TABLE "Tratamiento" ADD COLUMN "precioBase" DECIMAL(10,2);

-- CreateTable: TratamientoInsumo
CREATE TABLE "TratamientoInsumo" (
    "id" TEXT NOT NULL,
    "tratamientoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "TratamientoInsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CirugiaCatalogo
CREATE TABLE "CirugiaCatalogo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precioARS" DECIMAL(10,2),
    "precioUSD" DECIMAL(10,2),
    "precioBase" DECIMAL(10,2),
    "duracionMinutos" INTEGER,
    "profesionalId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CirugiaCatalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CirugiaInsumo
CREATE TABLE "CirugiaInsumo" (
    "id" TEXT NOT NULL,
    "cirugiaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "CirugiaInsumo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TratamientoInsumo_tratamientoId_idx" ON "TratamientoInsumo"("tratamientoId");
CREATE UNIQUE INDEX "TratamientoInsumo_tratamientoId_productoId_key" ON "TratamientoInsumo"("tratamientoId", "productoId");

-- CreateIndex
CREATE INDEX "CirugiaCatalogo_profesionalId_activo_idx" ON "CirugiaCatalogo"("profesionalId", "activo");
CREATE UNIQUE INDEX "CirugiaCatalogo_nombre_profesionalId_key" ON "CirugiaCatalogo"("nombre", "profesionalId");

-- CreateIndex
CREATE INDEX "CirugiaInsumo_cirugiaId_idx" ON "CirugiaInsumo"("cirugiaId");
CREATE UNIQUE INDEX "CirugiaInsumo_cirugiaId_productoId_key" ON "CirugiaInsumo"("cirugiaId", "productoId");

-- AddForeignKey
ALTER TABLE "TratamientoInsumo" ADD CONSTRAINT "TratamientoInsumo_tratamientoId_fkey" FOREIGN KEY ("tratamientoId") REFERENCES "Tratamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TratamientoInsumo" ADD CONSTRAINT "TratamientoInsumo_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CirugiaCatalogo" ADD CONSTRAINT "CirugiaCatalogo_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CirugiaInsumo" ADD CONSTRAINT "CirugiaInsumo_cirugiaId_fkey" FOREIGN KEY ("cirugiaId") REFERENCES "CirugiaCatalogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CirugiaInsumo" ADD CONSTRAINT "CirugiaInsumo_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

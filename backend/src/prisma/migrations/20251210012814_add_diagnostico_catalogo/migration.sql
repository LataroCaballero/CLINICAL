-- CreateTable
CREATE TABLE "DiagnosticoCatalogo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosticoCatalogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticoCatalogo_nombre_key" ON "DiagnosticoCatalogo"("nombre");

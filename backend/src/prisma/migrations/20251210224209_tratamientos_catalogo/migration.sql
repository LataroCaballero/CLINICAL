-- CreateTable
CREATE TABLE "TratamientoCatalogo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TratamientoCatalogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TratamientoCatalogo_nombre_key" ON "TratamientoCatalogo"("nombre");

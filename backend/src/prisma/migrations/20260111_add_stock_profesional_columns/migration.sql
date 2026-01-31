-- Migration: Add profesionalId to stock tables for multi-tenant support

-- Step 1: Drop the old unique constraint on Inventario (if exists)
DROP INDEX IF EXISTS "Inventario_productoId_key";

-- Step 2: Add profesionalId columns as NOT NULL
ALTER TABLE "Inventario" ADD COLUMN "profesionalId" TEXT NOT NULL;
ALTER TABLE "Lote" ADD COLUMN "profesionalId" TEXT NOT NULL;
ALTER TABLE "OrdenCompra" ADD COLUMN "profesionalId" TEXT NOT NULL;
ALTER TABLE "VentaProducto" ADD COLUMN "profesionalId" TEXT NOT NULL;

-- Step 3: Create the unique constraint for Inventario (producto + profesional)
CREATE UNIQUE INDEX "Inventario_productoId_profesionalId_key" ON "Inventario"("productoId", "profesionalId");

-- Step 4: Add foreign key constraints
ALTER TABLE "Inventario" ADD CONSTRAINT "Inventario_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VentaProducto" ADD CONSTRAINT "VentaProducto_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

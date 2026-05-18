import { Module } from '@nestjs/common';
// Controllers
import { ProductosController } from './controllers/productos.controller';
import { InventarioController } from './controllers/inventario.controller';
import { ProveedoresController } from './controllers/proveedores.controller';
import { OrdenesCompraController } from './controllers/ordenes-compra.controller';
import { VentasProductoController } from './controllers/ventas-producto.controller';

// Services
import { ProductosService } from './services/productos.service';
import { InventarioService } from './services/inventario.service';
import { ProveedoresService } from './services/proveedores.service';
import { OrdenesCompraService } from './services/ordenes-compra.service';
import { VentasProductoService } from './services/ventas-producto.service';

// External modules
import { CuentasCorrientesProveedoresModule } from '../cuentas-corrientes-proveedores/cuentas-corrientes-proveedores.module';

@Module({
  imports: [CuentasCorrientesProveedoresModule],
  controllers: [
    ProductosController,
    InventarioController,
    ProveedoresController,
    OrdenesCompraController,
    VentasProductoController,
  ],
  providers: [
    ProductosService,
    InventarioService,
    ProveedoresService,
    OrdenesCompraService,
    VentasProductoService,
  ],
  exports: [
    ProductosService,
    InventarioService,
    ProveedoresService,
    OrdenesCompraService,
    VentasProductoService,
  ],
})
export class StockModule {}

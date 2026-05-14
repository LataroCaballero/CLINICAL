import { Module } from '@nestjs/common';
import { CuentasCorrientesProveedoresController } from './cuentas-corrientes-proveedores.controller';
import { CuentasCorrientesProveedoresService } from './cuentas-corrientes-proveedores.service';

@Module({
  controllers: [CuentasCorrientesProveedoresController],
  providers: [CuentasCorrientesProveedoresService],
  exports: [CuentasCorrientesProveedoresService],
})
export class CuentasCorrientesProveedoresModule {}

import { Module } from '@nestjs/common';
import { CuentasCorrientesController } from './cuentas-corrientes.controller';
import { CuentasCorrientesService } from './cuentas-corrientes.service';

@Module({
  controllers: [CuentasCorrientesController],
  providers: [CuentasCorrientesService],
  exports: [CuentasCorrientesService],
})
export class CuentasCorrientesModule {}

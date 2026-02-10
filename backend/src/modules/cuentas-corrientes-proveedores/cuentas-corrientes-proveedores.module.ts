import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CuentasCorrientesProveedoresController } from './cuentas-corrientes-proveedores.controller';
import { CuentasCorrientesProveedoresService } from './cuentas-corrientes-proveedores.service';

@Module({
  controllers: [CuentasCorrientesProveedoresController],
  providers: [PrismaService, CuentasCorrientesProveedoresService],
  exports: [CuentasCorrientesProveedoresService],
})
export class CuentasCorrientesProveedoresModule {}

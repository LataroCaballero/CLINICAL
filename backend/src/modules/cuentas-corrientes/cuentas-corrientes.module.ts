import { Module } from '@nestjs/common';
import { CuentasCorrientesController } from './cuentas-corrientes.controller';
import { CuentasCorrientesService } from './cuentas-corrientes.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [CuentasCorrientesController],
  providers: [CuentasCorrientesService, PrismaService],
  exports: [CuentasCorrientesService],
})
export class CuentasCorrientesModule {}

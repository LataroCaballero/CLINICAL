import { Module } from '@nestjs/common';
import { PresupuestosController } from './presupuestos.controller';
import { PresupuestosService } from './presupuestos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CuentasCorrientesModule } from '../cuentas-corrientes/cuentas-corrientes.module';

@Module({
  imports: [CuentasCorrientesModule],
  controllers: [PresupuestosController],
  providers: [PresupuestosService, PrismaService],
  exports: [PresupuestosService],
})
export class PresupuestosModule {}

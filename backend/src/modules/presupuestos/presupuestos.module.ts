import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PresupuestosController } from './presupuestos.controller';
import { PresupuestoPublicController } from './presupuesto-public.controller';
import { PresupuestosService } from './presupuestos.service';
import { PresupuestoPdfService } from './presupuesto-pdf.service';
import { PresupuestoEmailService } from './presupuesto-email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CuentasCorrientesModule } from '../cuentas-corrientes/cuentas-corrientes.module';

@Module({
  imports: [CuentasCorrientesModule, ConfigModule],
  controllers: [PresupuestosController, PresupuestoPublicController],
  providers: [
    PresupuestosService,
    PresupuestoPdfService,
    PresupuestoEmailService,
    PrismaService,
  ],
  exports: [PresupuestosService],
})
export class PresupuestosModule {}

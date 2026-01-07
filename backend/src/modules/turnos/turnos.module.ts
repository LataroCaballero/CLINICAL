import { Module } from '@nestjs/common';
import { TurnosController } from './turnos.controller';
import { TurnosService } from './turnos.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CuentasCorrientesModule } from '../cuentas-corrientes/cuentas-corrientes.module';

@Module({
  imports: [CuentasCorrientesModule],
  controllers: [TurnosController],
  providers: [TurnosService, PrismaService],
})
export class TurnosModule {}

import { Module } from '@nestjs/common';
import { FinanzasController } from './finanzas.controller';
import { FinanzasService } from './finanzas.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CuentasCorrientesModule } from '../cuentas-corrientes/cuentas-corrientes.module';
import { AfipStubService } from './afip/afip-stub.service';

@Module({
  imports: [CuentasCorrientesModule],
  controllers: [FinanzasController],
  providers: [FinanzasService, PrismaService, AfipStubService],
  exports: [FinanzasService, AfipStubService],
})
export class FinanzasModule {}

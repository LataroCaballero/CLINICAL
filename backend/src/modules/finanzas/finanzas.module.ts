import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FinanzasController } from './finanzas.controller';
import { FinanzasService } from './finanzas.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CuentasCorrientesModule } from '../cuentas-corrientes/cuentas-corrientes.module';
import { WsaaModule } from '../wsaa/wsaa.module';
import { AfipStubService } from './afip/afip-stub.service';
import { AfipRealService } from './afip/afip-real.service';
import { AFIP_SERVICE } from './afip/afip.constants';
import { WSAA_SERVICE } from '../wsaa/wsaa.constants';
import { WsaaServiceInterface } from '../wsaa/wsaa.interfaces';
import { CaeEmissionProcessor, CAE_QUEUE } from './processors/cae-emission.processor';
import { CaeaInformarProcessor, CAEA_INFORMAR_QUEUE } from './processors/caea-informar.processor';
import { CaeaService } from './afip/caea.service';
import { CaeaPrefetchScheduler } from './schedulers/caea-prefetch.scheduler';
import { FacturaPdfService } from './factura-pdf.service';

@Module({
  imports: [
    CuentasCorrientesModule,
    WsaaModule,                                         // Makes WSAA_SERVICE injectable in AfipRealService
    BullModule.registerQueue({ name: CAE_QUEUE }),      // Registers 'cae-emission' BullMQ queue
    BullModule.registerQueue({ name: CAEA_INFORMAR_QUEUE }), // Registers 'caea-informar' BullMQ queue
    ConfigModule,
  ],
  controllers: [FinanzasController],
  providers: [
    FinanzasService,
    PrismaService,
    CaeEmissionProcessor,
    CaeaService,
    CaeaPrefetchScheduler,
    CaeaInformarProcessor,
    FacturaPdfService,
    {
      provide: AFIP_SERVICE,
      useFactory: (
        wsaaService: WsaaServiceInterface,
        prisma: PrismaService,
        config: ConfigService,
      ) => {
        if (process.env.USE_AFIP_STUB === 'true') {
          return new AfipStubService();
        }
        return new AfipRealService(wsaaService, prisma, config);
      },
      inject: [WSAA_SERVICE, PrismaService, ConfigService],
    },
  ],
  exports: [FinanzasService],
})
export class FinanzasModule {}

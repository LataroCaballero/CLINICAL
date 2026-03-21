import { Module } from '@nestjs/common';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { WsaaModule } from '../wsaa/wsaa.module';
import { AfipConfigController } from './afip-config.controller';
import { AfipConfigService } from './afip-config.service';
import { CertExpiryScheduler } from './cert-expiry.scheduler';

@Module({
  imports: [
    WhatsappModule,
    WsaaModule,
    // PrismaModule is @Global() — PrismaService available without explicit import
    // DO NOT add ScheduleModule.forRoot() — already registered by ReportesModule and PacientesModule
  ],
  controllers: [AfipConfigController],
  providers: [AfipConfigService, CertExpiryScheduler],
  exports: [AfipConfigService],
})
export class AfipConfigModule {}

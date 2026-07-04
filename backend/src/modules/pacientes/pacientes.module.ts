import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PacientesController } from './pacientes.controller';
import { PacientesService } from './pacientes.service';
import { SeguimientoSchedulerService } from './seguimiento-scheduler.service';
import { CirugiaRealizadaSchedulerService } from './cirugia-realizada-scheduler.service';
import { PortalEmailService } from './portal-email.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [ScheduleModule.forRoot(), WhatsappModule],
  controllers: [PacientesController],
  providers: [PacientesService, SeguimientoSchedulerService, CirugiaRealizadaSchedulerService, PortalEmailService],
})
export class PacientesModule {}

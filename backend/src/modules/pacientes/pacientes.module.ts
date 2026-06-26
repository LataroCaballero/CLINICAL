import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PacientesController } from './pacientes.controller';
import { PacientesService } from './pacientes.service';
import { SeguimientoSchedulerService } from './seguimiento-scheduler.service';
import { PortalEmailService } from './portal-email.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [PacientesController],
  providers: [PacientesService, SeguimientoSchedulerService, PortalEmailService],
})
export class PacientesModule {}

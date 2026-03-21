import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PacientesController } from './pacientes.controller';
import { PacientesService } from './pacientes.service';
import { SeguimientoSchedulerService } from './seguimiento-scheduler.service';
import { PrismaService } from '@/src/prisma/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [PacientesController],
  providers: [PacientesService, SeguimientoSchedulerService, PrismaService],
})
export class PacientesModule {}

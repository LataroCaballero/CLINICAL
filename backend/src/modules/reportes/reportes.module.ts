import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { ReportesController } from './reportes.controller';
import { ReportesDashboardService } from './services/reportes-dashboard.service';
import { ReportesOperativosService } from './services/reportes-operativos.service';
import { ReportesFinancierosService } from './services/reportes-financieros.service';
import { ReportesExportService } from './services/reportes-export.service';
import { ReportesSuscripcionesService } from './services/reportes-suscripciones.service';
import { ReportesSchedulerService } from './services/reportes-scheduler.service';
import { EmailService } from './services/email.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot(), ConfigModule],
  controllers: [ReportesController],
  providers: [
    ReportesDashboardService,
    ReportesOperativosService,
    ReportesFinancierosService,
    ReportesExportService,
    ReportesSuscripcionesService,
    ReportesSchedulerService,
    EmailService,
    PrismaService,
  ],
  exports: [
    ReportesDashboardService,
    ReportesOperativosService,
    ReportesFinancierosService,
    ReportesExportService,
    ReportesSuscripcionesService,
  ],
})
export class ReportesModule {}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  Res,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Auth } from '../auth/decorators/auth.decorator';
import {
  DashboardFiltersDto,
  ReporteTurnosFiltersDto,
  ReporteAusentismoFiltersDto,
  ReporteFiltersDto,
  ReporteProcedimientosFiltersDto,
  ReporteIngresosFiltersDto,
  ReporteCuentasPorCobrarFiltersDto,
  ReporteMorosidadFiltersDto,
} from './dto';
import { ExportOptionsDto, ProgramarEnvioDto } from './dto/export-options.dto';
import {
  CreateSuscripcionDto,
  UpdateSuscripcionDto,
  SendTestReportDto,
} from './dto/suscripcion.dto';
import { ReportesDashboardService } from './services/reportes-dashboard.service';
import { ReportesOperativosService } from './services/reportes-operativos.service';
import { ReportesFinancierosService } from './services/reportes-financieros.service';
import { ReportesExportService } from './services/reportes-export.service';
import { ReportesSuscripcionesService } from './services/reportes-suscripciones.service';
import { ReportesSchedulerService } from './services/reportes-scheduler.service';

@Controller('reportes')
@Auth('ADMIN', 'PROFESIONAL')
export class ReportesController {
  constructor(
    private readonly dashboardService: ReportesDashboardService,
    private readonly operativosService: ReportesOperativosService,
    private readonly financierosService: ReportesFinancierosService,
    private readonly exportService: ReportesExportService,
    private readonly suscripcionesService: ReportesSuscripcionesService,
    private readonly schedulerService: ReportesSchedulerService,
  ) {}

  // ============================================================
  // RF-020: Dashboard Principal
  // ============================================================

  /**
   * KPIs y métricas del día para el dashboard principal
   */
  @Get('dashboard')
  getDashboard(@Query() filters: DashboardFiltersDto) {
    return this.dashboardService.getDashboardKPIs(filters);
  }

  // ============================================================
  // RF-021: Reportes Operativos
  // ============================================================

  /**
   * Reporte de turnos (diario, semanal, mensual)
   */
  @Get('operativos/turnos')
  getReporteTurnos(@Query() filters: ReporteTurnosFiltersDto) {
    return this.operativosService.getReporteTurnos(filters);
  }

  /**
   * Tasa de ausentismo por paciente
   */
  @Get('operativos/ausentismo')
  getReporteAusentismo(@Query() filters: ReporteAusentismoFiltersDto) {
    return this.operativosService.getReporteAusentismo(filters);
  }

  /**
   * Ocupación por profesional
   */
  @Get('operativos/ocupacion')
  getReporteOcupacion(@Query() filters: ReporteFiltersDto) {
    return this.operativosService.getReporteOcupacion(filters);
  }

  /**
   * Ranking de procedimientos más realizados
   */
  @Get('operativos/procedimientos-ranking')
  getRankingProcedimientos(@Query() filters: ReporteProcedimientosFiltersDto) {
    return this.operativosService.getRankingProcedimientos(filters);
  }

  /**
   * Tracking de ventas de productos a pacientes
   */
  @Get('operativos/ventas-productos')
  getVentasProductos(@Query() filters: ReporteFiltersDto) {
    return this.operativosService.getVentasProductos(filters);
  }

  // ============================================================
  // RF-022: Reportes Financieros
  // ============================================================

  /**
   * Ingresos por período
   */
  @Get('financieros/ingresos')
  getReporteIngresos(@Query() filters: ReporteIngresosFiltersDto) {
    return this.financierosService.getReporteIngresos(filters);
  }

  /**
   * Ingresos por profesional
   */
  @Get('financieros/ingresos-por-profesional')
  getIngresosPorProfesional(@Query() filters: ReporteFiltersDto) {
    return this.financierosService.getIngresosPorProfesional(filters);
  }

  /**
   * Ingresos por obra social
   */
  @Get('financieros/ingresos-por-obra-social')
  getIngresosPorObraSocial(@Query() filters: ReporteFiltersDto) {
    return this.financierosService.getIngresosPorObraSocial(filters);
  }

  /**
   * Ingresos por prestación/práctica
   */
  @Get('financieros/ingresos-por-prestacion')
  getIngresosPorPrestacion(@Query() filters: ReporteFiltersDto) {
    return this.financierosService.getIngresosPorPrestacion(filters);
  }

  /**
   * Cuentas por cobrar
   */
  @Get('financieros/cuentas-por-cobrar')
  getCuentasPorCobrar(@Query() filters: ReporteCuentasPorCobrarFiltersDto) {
    return this.financierosService.getCuentasPorCobrar(filters);
  }

  /**
   * Morosidad
   */
  @Get('financieros/morosidad')
  getMorosidad(@Query() filters: ReporteMorosidadFiltersDto) {
    return this.financierosService.getMorosidad(filters);
  }

  /**
   * Pagos pendientes
   */
  @Get('financieros/pagos-pendientes')
  getPagosPendientes(@Query() filters: ReporteFiltersDto) {
    return this.financierosService.getPagosPendientes(filters);
  }

  // ============================================================
  // RF-023: Exportación de Reportes
  // ============================================================

  /**
   * Exportar reporte a JSON, CSV o PDF
   */
  @Post('exportar')
  async exportarReporte(
    @Body() options: ExportOptionsDto,
    @Res() res: Response,
  ) {
    const result = await this.exportService.exportarReporte(options);

    // Configurar headers comunes
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );

    switch (options.formato) {
      case 'json':
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.send(result.data);

      case 'csv':
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        // Agregar BOM para que Excel reconozca UTF-8
        const csvWithBom = '\ufeff' + result.data;
        return res.send(csvWithBom);

      case 'pdf':
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', (result.data as Buffer).length);
        return res.end(result.data);

      default:
        return res.json(result);
    }
  }

  /**
   * Programar envío de reporte por email (opcional - fase futura)
   */
  @Post('programar-envio')
  programarEnvio(@Body() options: ProgramarEnvioDto) {
    return this.exportService.programarEnvio(options);
  }

  // ============================================================
  // RF-024: Suscripciones de Reportes por Email
  // ============================================================

  /**
   * Obtiene los tipos de reporte disponibles para suscripción
   */
  @Get('suscripciones/tipos')
  getTiposReporte() {
    return this.suscripcionesService.getTiposReporteDisponibles();
  }

  /**
   * Obtiene las suscripciones del usuario autenticado
   */
  @Get('suscripciones')
  getSuscripciones(@Req() req: Request) {
    const userId = (req as any).user?.sub || (req as any).user?.id;
    return this.suscripcionesService.getSuscripciones(userId);
  }

  /**
   * Crea una nueva suscripción de reporte
   */
  @Post('suscripciones')
  createSuscripcion(@Req() req: Request, @Body() dto: CreateSuscripcionDto) {
    const userId = (req as any).user?.sub || (req as any).user?.id;
    return this.suscripcionesService.createSuscripcion(userId, dto);
  }

  /**
   * Actualiza una suscripción existente
   */
  @Patch('suscripciones/:id')
  updateSuscripcion(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateSuscripcionDto,
  ) {
    const userId = (req as any).user?.sub || (req as any).user?.id;
    return this.suscripcionesService.updateSuscripcion(userId, id, dto);
  }

  /**
   * Activa/desactiva una suscripción
   */
  @Patch('suscripciones/:id/toggle')
  toggleSuscripcion(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user?.sub || (req as any).user?.id;
    return this.suscripcionesService.toggleSuscripcion(userId, id);
  }

  /**
   * Elimina una suscripción
   */
  @Delete('suscripciones/:id')
  deleteSuscripcion(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user?.sub || (req as any).user?.id;
    return this.suscripcionesService.deleteSuscripcion(userId, id);
  }

  /**
   * Envía un reporte de prueba al email especificado
   */
  @Post('suscripciones/test')
  async sendTestReport(@Req() req: Request, @Body() dto: SendTestReportDto) {
    const userId = (req as any).user?.sub || (req as any).user?.id;
    const enviado = await this.schedulerService.sendTestReport(
      userId,
      dto.tipoReporte,
      dto.emailDestino,
    );
    return { success: enviado };
  }
}

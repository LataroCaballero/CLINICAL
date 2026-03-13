import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { FinanzasService } from './finanzas.service';
import {
  CreatePagoDto,
  PagosFiltersDto,
  CreateFacturaDto,
  FacturasFiltersDto,
  LiquidacionesFiltersDto,
  MarcarPracticasPagadasDto,
  ReporteFiltersDto,
  CreateLoteDto,
  SetLimiteMensualDto,
} from './dto/finanzas.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { MedioPago, TipoFactura, EstadoLiquidacion } from '@prisma/client';

@Controller('finanzas')
@Auth('ADMIN', 'PROFESIONAL', 'FACTURADOR')
export class FinanzasController {
  constructor(private readonly service: FinanzasService) {}

  /**
   * Dashboard KPIs
   */
  @Get('dashboard')
  getDashboard(@Query('profesionalId') profesionalId?: string) {
    return this.service.getDashboard(profesionalId);
  }

  /**
   * Ingresos por día
   */
  @Get('ingresos-por-dia')
  getIngresosPorDia(
    @Query('profesionalId') profesionalId?: string,
    @Query('dias') dias?: string,
  ) {
    return this.service.getIngresosPorDia(
      profesionalId,
      dias ? parseInt(dias) : 30,
    );
  }

  /**
   * Ingresos por obra social
   */
  @Get('ingresos-por-obra-social')
  getIngresosPorObraSocial(@Query('profesionalId') profesionalId?: string) {
    return this.service.getIngresosPorObraSocial(profesionalId);
  }

  /**
   * Lista de pagos
   */
  @Get('pagos')
  getPagos(
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('medioPago') medioPago?: MedioPago,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const filters: PagosFiltersDto = {
      fechaDesde,
      fechaHasta,
      medioPago,
      profesionalId,
    };
    return this.service.getPagos(filters);
  }

  /**
   * Registrar un pago
   */
  @Post('pagos')
  createPago(@Body() dto: CreatePagoDto, @Request() req: any) {
    return this.service.createPago(dto, req.user?.id);
  }

  /**
   * Lista de facturas
   */
  @Get('facturas')
  getFacturas(
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('tipo') tipo?: TipoFactura,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const filters: FacturasFiltersDto = {
      fechaDesde,
      fechaHasta,
      tipo,
      profesionalId,
    };
    return this.service.getFacturas(filters);
  }

  /**
   * Crear una factura
   */
  @Post('facturas')
  createFactura(@Body() dto: CreateFacturaDto) {
    return this.service.createFactura(dto);
  }

  /**
   * Anular una factura
   */
  @Post('facturas/:id/anular')
  anularFactura(@Param('id') id: string) {
    return this.service.anularFactura(id);
  }

  /**
   * Prácticas pendientes de liquidación
   */
  @Get('practicas-pendientes')
  getPracticasPendientes(
    @Query('estadoLiquidacion') estadoLiquidacion?: EstadoLiquidacion,
    @Query('profesionalId') profesionalId?: string,
    @Query('obraSocialId') obraSocialId?: string,
  ) {
    const filters: LiquidacionesFiltersDto = {
      estadoLiquidacion,
      profesionalId,
      obraSocialId,
    };
    return this.service.getPracticasPendientes(filters);
  }

  /**
   * Marcar prácticas como pagadas
   */
  @Post('practicas/marcar-pagadas')
  marcarPracticasPagadas(@Body() dto: MarcarPracticasPagadasDto) {
    return this.service.marcarPracticasPagadas(dto.practicaIds);
  }

  /**
   * Cierre mensual
   */
  @Get('cierre-mensual/:mes')
  getCierreMensual(
    @Param('mes') mes: string,
    @Query('profesionalId') profesionalId?: string,
  ) {
    return this.service.getCierreMensual(mes, profesionalId);
  }

  /**
   * Reporte de ingresos
   */
  @Get('reportes/ingresos')
  getReporteIngresos(
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const filters: ReporteFiltersDto = {
      fechaDesde,
      fechaHasta,
      profesionalId,
    };
    return this.service.getReporteIngresos(filters);
  }

  // ─── Billing-limit + settlement endpoints (ADMIN + FACTURADOR only) ───────

  /**
   * Returns the available billing limit for a professional in a given month.
   * Returns { limite, emitido, disponible }.
   */
  @Get('limite-disponible')
  @Auth('ADMIN', 'FACTURADOR')
  getLimiteDisponible(
    @Query('profesionalId') profesionalId: string,
    @Query('mes') mes: string,
  ) {
    return this.service.getLimiteDisponible(profesionalId, mes);
  }

  /**
   * Upserts the monthly billing limit for a professional.
   */
  @Post('limite-mensual')
  @Auth('ADMIN', 'FACTURADOR')
  setLimiteMensual(@Body() dto: SetLimiteMensualDto, @Request() req: any) {
    return this.service.setLimiteMensual(dto.profesionalId, dto.mes, dto.limite);
  }

  /**
   * Returns pending practices grouped by obra social for a professional.
   * Used by the facturador to see which OS have pending practices.
   */
  @Get('practicas-pendientes-agrupadas')
  @Auth('ADMIN', 'FACTURADOR')
  getPracticasPendientesAgrupadas(
    @Query('profesionalId') profesionalId: string,
  ) {
    return this.service.getPracticasPendientesAgrupadas(profesionalId);
  }

  /**
   * Returns flat list of pending practices for a specific professional + OS.
   * Used for lote preparation (selecting which practices to settle).
   */
  @Get('practicas-pendientes/:profesionalId/por-os/:obraSocialId')
  @Auth('ADMIN', 'FACTURADOR')
  getPracticasPendientesPorOS(
    @Param('profesionalId') profesionalId: string,
    @Param('obraSocialId') obraSocialId: string,
  ) {
    return this.service.getPracticasPendientesPorOS(profesionalId, obraSocialId);
  }

  /**
   * List of liquidaciones with optional filters.
   * Must appear BEFORE /liquidaciones/:id to avoid literal string being matched by param route.
   */
  @Get('liquidaciones')
  @Auth('ADMIN', 'FACTURADOR')
  getLiquidaciones(
    @Query('profesionalId') profesionalId?: string,
    @Query('periodo') periodo?: string,
  ) {
    return this.service.getLiquidaciones({ profesionalId, periodo });
  }

  /**
   * Atomically creates a LiquidacionObraSocial lote and marks practices as PAGADO.
   */
  @Post('liquidaciones/crear-lote')
  @Auth('ADMIN', 'FACTURADOR')
  crearLoteLiquidacion(@Body() dto: CreateLoteDto, @Request() req: any) {
    return this.service.crearLoteLiquidacion(dto, req.user?.id);
  }

  /**
   * Returns a single liquidacion by ID with its associated practices.
   */
  @Get('liquidaciones/:id')
  @Auth('ADMIN', 'FACTURADOR')
  getLiquidacionById(@Param('id') id: string) {
    return this.service.getLiquidacionById(id);
  }
}

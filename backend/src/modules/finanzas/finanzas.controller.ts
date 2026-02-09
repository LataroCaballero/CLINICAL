import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
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
} from './dto/finanzas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MedioPago, TipoFactura, EstadoLiquidacion } from '@prisma/client';

@Controller('finanzas')
@UseGuards(JwtAuthGuard)
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
}

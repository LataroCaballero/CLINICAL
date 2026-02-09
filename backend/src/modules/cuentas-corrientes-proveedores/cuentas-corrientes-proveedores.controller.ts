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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CuentasCorrientesProveedoresService } from './cuentas-corrientes-proveedores.service';
import { RegistrarPagoProveedorDto, PagarCuotaDto } from './dto';
import { EstadoCuota } from '@prisma/client';

@Controller('cuentas-corrientes-proveedores')
@UseGuards(JwtAuthGuard)
export class CuentasCorrientesProveedoresController {
  constructor(private readonly service: CuentasCorrientesProveedoresService) {}

  @Get()
  async findAll(
    @Query('profesionalId') profesionalId?: string,
    @Query('soloConDeuda') soloConDeuda?: string,
  ) {
    return this.service.findAll({
      profesionalId,
      soloConDeuda: soloConDeuda === 'true',
    });
  }

  @Get('resumen/deudas')
  async getResumenDeudas(@Query('profesionalId') profesionalId: string) {
    return this.service.getResumenDeudas(profesionalId);
  }

  @Get('cuotas/vencidas')
  async getCuotasVencidas(@Query('profesionalId') profesionalId: string) {
    return this.service.getCuotasVencidas(profesionalId);
  }

  @Get('cuotas/proximas')
  async getCuotasProximas(
    @Query('profesionalId') profesionalId: string,
    @Query('dias') dias?: string,
  ) {
    return this.service.getCuotasProximas(
      profesionalId,
      dias ? parseInt(dias, 10) : 30,
    );
  }

  @Get(':proveedorId')
  async findByProveedor(
    @Param('proveedorId') proveedorId: string,
    @Query('profesionalId') profesionalId: string,
  ) {
    return this.service.findByProveedor(proveedorId, profesionalId);
  }

  @Get(':proveedorId/movimientos')
  async findMovimientos(
    @Param('proveedorId') proveedorId: string,
    @Query('profesionalId') profesionalId: string,
  ) {
    return this.service.findMovimientos(proveedorId, profesionalId);
  }

  @Get(':proveedorId/cuotas')
  async findCuotas(
    @Param('proveedorId') proveedorId: string,
    @Query('profesionalId') profesionalId: string,
    @Query('estado') estado?: EstadoCuota,
  ) {
    return this.service.findCuotasByProveedor(
      proveedorId,
      profesionalId,
      estado,
    );
  }

  @Post(':proveedorId/pagos')
  async registrarPago(
    @Param('proveedorId') proveedorId: string,
    @Query('profesionalId') profesionalId: string,
    @Body() dto: RegistrarPagoProveedorDto,
    @Request() req: any,
  ) {
    return this.service.registrarPago(
      proveedorId,
      profesionalId,
      dto,
      req.user?.id,
    );
  }

  @Post('cuotas/:cuotaId/pagar')
  async pagarCuota(
    @Param('cuotaId') cuotaId: string,
    @Query('profesionalId') profesionalId: string,
    @Body() dto: PagarCuotaDto,
    @Request() req: any,
  ) {
    return this.service.pagarCuota(cuotaId, profesionalId, dto, req.user?.id);
  }
}

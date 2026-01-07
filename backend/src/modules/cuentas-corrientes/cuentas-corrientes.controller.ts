import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CuentasCorrientesService } from './cuentas-corrientes.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cuentas-corrientes')
@UseGuards(JwtAuthGuard)
export class CuentasCorrientesController {
  constructor(private readonly service: CuentasCorrientesService) {}

  @Get(':pacienteId')
  findByPaciente(@Param('pacienteId') pacienteId: string) {
    return this.service.findByPaciente(pacienteId);
  }

  @Get(':pacienteId/movimientos')
  findMovimientos(@Param('pacienteId') pacienteId: string) {
    return this.service.findMovimientos(pacienteId);
  }

  @Post(':pacienteId/movimientos')
  createMovimiento(
    @Param('pacienteId') pacienteId: string,
    @Body() dto: CreateMovimientoDto,
  ) {
    return this.service.createMovimiento(pacienteId, dto);
  }
}

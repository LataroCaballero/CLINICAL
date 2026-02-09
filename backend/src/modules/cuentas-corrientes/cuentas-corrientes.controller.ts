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
import { CuentasCorrientesService } from './cuentas-corrientes.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cuentas-corrientes')
@UseGuards(JwtAuthGuard)
export class CuentasCorrientesController {
  constructor(private readonly service: CuentasCorrientesService) {}

  @Get()
  findAll(
    @Query('profesionalId') profesionalId?: string,
    @Query('soloConDeuda') soloConDeuda?: string,
  ) {
    return this.service.findAll({
      profesionalId,
      soloConDeuda: soloConDeuda === 'true',
    });
  }

  @Get(':pacienteId')
  findByPaciente(@Param('pacienteId') pacienteId: string) {
    return this.service.findByPaciente(pacienteId);
  }

  @Get(':pacienteId/movimientos')
  findMovimientos(@Param('pacienteId') pacienteId: string) {
    return this.service.findMovimientos(pacienteId);
  }

  @Get(':pacienteId/antiguedad-deuda')
  getAntiguedadDeuda(@Param('pacienteId') pacienteId: string) {
    return this.service.getAntiguedadDeuda(pacienteId);
  }

  @Post(':pacienteId/movimientos')
  createMovimiento(
    @Param('pacienteId') pacienteId: string,
    @Body() dto: CreateMovimientoDto,
    @Request() req: any,
  ) {
    // Agregar usuarioId del usuario autenticado
    dto.usuarioId = req.user?.id;
    return this.service.createMovimiento(pacienteId, dto);
  }

  @Post('movimientos/:movimientoId/anular')
  anularMovimiento(
    @Param('movimientoId') movimientoId: string,
    @Request() req: any,
  ) {
    return this.service.anularMovimiento(movimientoId, req.user?.id);
  }
}

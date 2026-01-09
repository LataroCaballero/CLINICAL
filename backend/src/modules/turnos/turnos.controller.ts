import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Patch,
  BadRequestException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TurnosService } from './turnos.service';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { ReprogramarTurnoDto } from './dto/reprogramar-turno.dto';
import { CobrarTurnoDto } from './dto/cobrar-turno.dto';
import { CreateCirugiaTurnoDto } from './dto/create-cirugia-turno.dto';
import { IniciarSesionDto } from './dto/iniciar-sesion.dto';
import { CerrarSesionDto } from './dto/cerrar-sesion.dto';
import { resolveScope } from '@/src/common/scope/resolve-scope';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('turnos')
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  @Post()
  crear(@Body() dto: CreateTurnoDto) {
    return this.turnosService.crearTurno(dto);
  }

  @Post('cirugia')
  crearCirugia(@Body() dto: CreateCirugiaTurnoDto) {
    return this.turnosService.crearTurnoCirugia(dto);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
    @Query('pacienteId') pacienteId?: string,
  ) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    return this.turnosService.findAll(scope, pacienteId);
  }

  @Patch(':id/cancelar')
  cancelar(@Param('id') id: string) {
    return this.turnosService.cancelarTurno(id);
  }

  @Patch(':id/finalizar')
  finalizar(@Param('id') id: string) {
    return this.turnosService.finalizarTurno(id);
  }

  @Patch(':id/confirmar')
  confirmar(@Param('id') id: string) {
    return this.turnosService.confirmarTurno(id);
  }

  @Patch(':id/reprogramar')
  reprogramar(@Param('id') id: string, @Body() dto: ReprogramarTurnoDto) {
    return this.turnosService.reprogramarTurno(id, dto);
  }

  @Get('agenda')
  agenda(
    @Query('profesionalId') profesionalId: string,
    @Query('fecha') fecha: string,
  ) {
    if (!profesionalId || !fecha) {
      throw new BadRequestException(
        'Debe especificar profesionalId y fecha (YYYY-MM-DD).',
      );
    }

    return this.turnosService.obtenerAgendaDiaria(profesionalId, fecha);
  }

  @Get('rango')
  obtenerPorRango(
    @Query('profesionalId') profesionalId: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    if (!profesionalId || !desde || !hasta) {
      throw new BadRequestException(
        'Debe enviar profesionalId, desde y hasta.',
      );
    }

    return this.turnosService.obtenerTurnosPorRango(
      profesionalId,
      desde,
      hasta,
    );
  }

  @Post(':id/cobrar')
  cobrar(@Param('id') id: string, @Body() dto: CobrarTurnoDto) {
    return this.turnosService.cobrarTurno(id, dto);
  }

  // ==================== LiveTurno Session Endpoints ====================

  @Post(':id/iniciar-sesion')
  iniciarSesion(@Param('id') id: string, @Body() dto?: IniciarSesionDto) {
    return this.turnosService.iniciarSesion(id, dto);
  }

  @Patch(':id/cerrar-sesion')
  cerrarSesion(@Param('id') id: string, @Body() dto?: CerrarSesionDto) {
    return this.turnosService.cerrarSesion(id, dto);
  }

  @Get('sesion-activa')
  sesionActiva(@Query('profesionalId') profesionalId: string) {
    if (!profesionalId) {
      throw new BadRequestException('Debe especificar profesionalId.');
    }
    return this.turnosService.obtenerSesionActiva(profesionalId);
  }
}

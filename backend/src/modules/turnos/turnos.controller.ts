import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { TurnosService } from './turnos.service';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { FindTurnosDto } from './dto/find-turnos.dto';
import { ReprogramarTurnoDto } from './dto/reprogramar-turno.dto';

@Controller('turnos')
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  @Post()
  crear(@Body() dto: CreateTurnoDto) {
    return this.turnosService.crearTurno(dto);
  }

  @Get()
  async listar(@Query() query: FindTurnosDto) {
    if (query.pacienteId) {
      return this.turnosService.obtenerTurnosPorPaciente(query.pacienteId);
    }

    // En MVP no exponemos listados generales
    return [];
  }

  @Patch(':id/cancelar')
  cancelar(@Param('id') id: string) {
    return this.turnosService.cancelarTurno(id);
  }

  @Patch(':id/finalizar')
  finalizar(@Param('id') id: string) {
    return this.turnosService.finalizarTurno(id);
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
}

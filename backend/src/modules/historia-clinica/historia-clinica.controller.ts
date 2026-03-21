import { Controller, Get, Param, Post, Body, Req } from '@nestjs/common';
import { HistoriaClinicaService } from './historia-clinica.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { CreateEntradaDto } from './dto/crear-entrada.dto';

@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
@Controller('pacientes/:pacienteId/historia-clinica')
export class HistoriaClinicaController {
  constructor(private readonly service: HistoriaClinicaService) {}

  @Get()
  async obtenerHistoria(@Param('pacienteId') pacienteId: string) {
    return this.service.obtenerHistoriaClinica(pacienteId);
  }

  @Post('entradas')
  async crearEntrada(
    @Param('pacienteId') pacienteId: string,
    @Body() body: CreateEntradaDto,
    @Req() req: any,
  ) {
    const profesionalId: string | undefined = req.user?.profesionalId;
    return this.service.crearEntrada(pacienteId, body, profesionalId);
  }
}

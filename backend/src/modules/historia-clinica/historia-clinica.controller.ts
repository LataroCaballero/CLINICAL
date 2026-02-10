import { Controller, Get, Param, Post, Body, Req } from '@nestjs/common';
import { HistoriaClinicaService } from './historia-clinica.service';
import { Auth } from '../auth/decorators/auth.decorator';

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
    @Body() body: { contenido: string },
    @Req() req: any,
  ) {
    return this.service.crearEntrada(pacienteId, body.contenido);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AlertasService } from './alertas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlertasResumenDto } from './dto/alertas-resumen.dto';

@Controller('alertas')
@UseGuards(JwtAuthGuard)
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) { }

  @Get('resumen')
  async getResumen(
    @Query('profesionalId') profesionalId?: string,
  ): Promise<AlertasResumenDto> {
    return this.alertasService.getResumen(profesionalId);
  }
}

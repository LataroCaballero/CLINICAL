import { Controller, Get, Query } from '@nestjs/common';
import { AlertasService } from './alertas.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { AlertasResumenDto } from './dto/alertas-resumen.dto';

@Controller('alertas')
@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR')
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) { }

  @Get('resumen')
  async getResumen(
    @Query('profesionalId') profesionalId?: string,
  ): Promise<AlertasResumenDto> {
    return this.alertasService.getResumen(profesionalId);
  }
}

import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { TiposTurnoService } from './tipos-turno.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { ConfigTipoTurnoItemDto } from './dto/config-tipo-turno.dto';

@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
@Controller('tipos-turno')
export class TiposTurnoController {
  constructor(private readonly tiposTurnoService: TiposTurnoService) {}

  @Get()
  findAll() {
    return this.tiposTurnoService.findAll();
  }

  @Get('config/:profesionalId')
  getConfig(@Param('profesionalId') profesionalId: string) {
    return this.tiposTurnoService.getConfigByProfesional(profesionalId);
  }

  @Put('config/:profesionalId')
  saveConfig(
    @Param('profesionalId') profesionalId: string,
    @Body() items: ConfigTipoTurnoItemDto[],
  ) {
    return this.tiposTurnoService.saveConfigByProfesional(profesionalId, items);
  }
}

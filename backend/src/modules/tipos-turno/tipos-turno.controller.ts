import { Controller, Get } from '@nestjs/common';
import { TiposTurnoService } from './tipos-turno.service';

@Controller('tipos-turno')
export class TiposTurnoController {
  constructor(private readonly tiposTurnoService: TiposTurnoService) {}

  @Get()
  findAll() {
    return this.tiposTurnoService.findAll();
  }
}

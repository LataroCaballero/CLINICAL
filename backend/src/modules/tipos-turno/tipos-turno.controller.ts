import { Controller, Get } from '@nestjs/common';
import { TiposTurnoService } from './tipos-turno.service';
import { Auth } from '../auth/decorators/auth.decorator';

@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
@Controller('tipos-turno')
export class TiposTurnoController {
  constructor(private readonly tiposTurnoService: TiposTurnoService) {}

  @Get()
  findAll() {
    return this.tiposTurnoService.findAll();
  }
}

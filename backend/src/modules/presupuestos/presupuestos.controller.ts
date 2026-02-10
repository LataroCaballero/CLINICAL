import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { PresupuestosService } from './presupuestos.service';
import { CreatePresupuestoDto } from './dto/create-presupuesto.dto';
import { Auth } from '../auth/decorators/auth.decorator';

@Controller('presupuestos')
@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR')
export class PresupuestosController {
  constructor(private readonly service: PresupuestosService) {}

  @Post()
  create(@Body() dto: CreatePresupuestoDto) {
    return this.service.create(dto);
  }

  @Get()
  findByPaciente(@Query('pacienteId') pacienteId: string) {
    return this.service.findByPaciente(pacienteId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/aceptar')
  aceptar(@Param('id') id: string) {
    return this.service.aceptar(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

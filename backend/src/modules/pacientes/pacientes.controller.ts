import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Header,
  UsePipes
} from '@nestjs/common';
import { SanitizeEmptyValuesPipe } from '../../common/pipes/sanitize-empty-values.pipe';
import { PacientesService } from './pacientes.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { PacienteListaDto } from './dto/paciente-lista.dto';

@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) { }

  // RF-007 — Alta de pacientes
  @Post()
  @UsePipes(new SanitizeEmptyValuesPipe())
  create(@Body() dto: CreatePacienteDto) {
    return this.pacientesService.create(dto);
  }

  // RF-007 — Modificar datos
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePacienteDto) {
    return this.pacientesService.update(id, dto);
  }

  // RF-007 — Baja lógica (opcional)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.pacientesService.delete(id);
  }

  @Get('suggest')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async suggest(@Query('q') q: string) {
    const results = await this.pacientesService.suggest(q);
    return results ?? [];
  }

  @Get()
  async listarPacientes(): Promise<PacienteListaDto[]> {
    return this.pacientesService.obtenerListaPacientes();
  }

  // Obtener por ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pacientesService.findOne(id);
  }
}

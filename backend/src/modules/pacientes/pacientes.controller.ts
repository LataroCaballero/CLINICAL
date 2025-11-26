import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
} from '@nestjs/common';
import { PacientesService } from './pacientes.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { SearchPacienteDto } from './dto/search-paciente.dto';

@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) {}

  // RF-007 — Alta de pacientes
  @Post()
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
  async suggest(@Res() res, @Query('q') q: string) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const results = await this.pacientesService.suggest(q);
    return results ?? [];
  }

  @Get()
  search(@Query() query: SearchPacienteDto) {
    return this.pacientesService.search(query); // tu búsqueda completa
  }

  // Obtener por ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pacientesService.findOne(id);
  }
}

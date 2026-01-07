import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Delete,
  Param,
} from '@nestjs/common';
import { DiagnosticosService } from './diagnosticos.service';
import { CreateDiagnosticoDto } from './dto/create-diagnostico.dto';

@Controller('diagnosticos')
export class DiagnosticosController {
  constructor(private readonly diagnosticosService: DiagnosticosService) {}

  // GET /diagnosticos  (lista completa o filtrada por q)
  @Get()
  findAll(@Query('q') q?: string) {
    if (q) {
      return this.diagnosticosService.search(q);
    }
    return this.diagnosticosService.findAll();
  }

  // POST /diagnosticos  { nombre: "Lumbalgia" }
  @Post()
  create(@Body() dto: CreateDiagnosticoDto) {
    return this.diagnosticosService.create(dto);
  }

  // Opcional: DELETE /diagnosticos/:id
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.diagnosticosService.remove(id);
  }
}

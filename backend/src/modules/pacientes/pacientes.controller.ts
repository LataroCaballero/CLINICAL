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
  UsePipes,
  Req,
} from '@nestjs/common';
import { SanitizeEmptyValuesPipe } from '../../common/pipes/sanitize-empty-values.pipe';
import { PacientesService } from './pacientes.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { PacienteListaDto } from './dto/paciente-lista.dto';
import { PrismaService } from '@/src/prisma/prisma.service';
import { UpdatePacienteSectionDto } from './dto/update-paciente-section.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { resolveScope } from '@/src/common/scope/resolve-scope';

@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR')
@Controller('pacientes')
export class PacientesController {
  constructor(
    private readonly pacientesService: PacientesService,
    private readonly prisma: PrismaService,
  ) {}

  // RF-007 — Alta de pacientes
  @Post()
  @UsePipes(new SanitizeEmptyValuesPipe())
  create(@Body() dto: CreatePacienteDto) {
    return this.pacientesService.create(dto);
  }

  // RF-007 — Modificar datos
  @Patch(':id')
  updatePacienteSection(
    @Param('id') id: string,
    @Body() dto: UpdatePacienteSectionDto,
  ) {
    return this.pacientesService.updatePacienteSection(id, dto);
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
  findAll(@Req() req: any, @Query('profesionalId') profesionalId?: string) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    return this.pacientesService.findAll(scope);
  }

  // Obtener por ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pacientesService.findOne(id);
  }

  // Crear una nueva objeción
  @Post('objeciones')
  async createObjection(@Body() body: { nombre: string }) {
    return this.prisma.objection.create({
      data: { nombre: body.nombre },
    });
  }

  // Buscar objeciones
  @Get('objeciones/suggest')
  async suggestObjecion(@Query('query') query: string) {
    return this.prisma.objection.findMany({
      where: {
        nombre: { contains: query, mode: 'insensitive' },
      },
      take: 10,
      orderBy: { nombre: 'asc' },
    });
  }

  // Asignar objeción a un paciente
  @Patch(':id/objecion')
  async updatePacienteObjecion(
    @Param('id') id: string,
    @Body() body: { objecionId: string | null },
  ) {
    return this.prisma.paciente.update({
      where: { id },
      data: { objecionId: body.objecionId },
      include: { objecion: true },
    });
  }
}

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
import { EtapaCRM, TemperaturaPaciente, MotivoPerdidaCRM } from '@prisma/client';
import { UpdateWhatsappOptInDto } from './dto/update-whatsapp-opt-in.dto';
import { CreateContactoDto } from './dto/create-contacto.dto';

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

  // CRM — Vista Kanban agrupada por etapaCRM
  @Get('kanban')
  getKanban(@Query('profesionalId') profesionalId: string) {
    return this.pacientesService.getKanban(profesionalId);
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

  // Log de Contactos — Lista de acción priorizada
  @Get('lista-accion')
  getListaAccion(
    @Query('profesionalId') profesionalId: string,
  ) {
    return this.pacientesService.getListaAccion(profesionalId);
  }

  // Log de Contactos — Historial de interacciones de un paciente
  @Get(':id/contactos')
  getContactosByPaciente(
    @Param('id') pacienteId: string,
    @Query('limit') limit?: string,
  ) {
    return this.pacientesService.getContactosByPaciente(
      pacienteId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  // Log de Contactos — Registrar una nueva interacción
  @Post(':id/contactos')
  createContacto(
    @Param('id') pacienteId: string,
    @Body() dto: CreateContactoDto,
    @Req() req: any,
  ) {
    const profesionalId = req.user?.profesionalId as string;
    return this.pacientesService.createContacto(pacienteId, profesionalId, dto);
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

  // CRM — Cambiar etapa del embudo
  @Patch(':id/etapa-crm')
  updateEtapaCRM(
    @Param('id') id: string,
    @Body() body: { etapaCRM: EtapaCRM; motivoPerdida?: MotivoPerdidaCRM },
  ) {
    return this.pacientesService.updateEtapaCRM(id, body);
  }

  // CRM — Cambiar temperatura
  @Patch(':id/temperatura')
  updateTemperatura(
    @Param('id') id: string,
    @Body() body: { temperatura: TemperaturaPaciente },
  ) {
    return this.pacientesService.updateTemperatura(id, body.temperatura);
  }

  // WhatsApp — Opt-in / opt-out del paciente
  @Patch(':id/whatsapp-opt-in')
  updateWhatsappOptIn(
    @Param('id') id: string,
    @Body() dto: UpdateWhatsappOptInDto,
  ) {
    return this.pacientesService.updateWhatsappOptIn(id, dto.optIn);
  }
}

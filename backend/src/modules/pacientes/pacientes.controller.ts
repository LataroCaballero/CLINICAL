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
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SanitizeEmptyValuesPipe } from '../../common/pipes/sanitize-empty-values.pipe';
import { PacientesService } from './pacientes.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { PacienteListaDto } from './dto/paciente-lista.dto';
import { PrismaService } from '@/src/prisma/prisma.service';
import { UpdatePacienteSectionDto } from './dto/update-paciente-section.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import {
  EtapaCRM,
  TemperaturaPaciente,
  FlujoPaciente,
  MotivoPerdidaCRM,
} from '@prisma/client';
import { UpdateFlujoDto } from './dto/update-flujo.dto';
import { UpdateWhatsappOptInDto } from './dto/update-whatsapp-opt-in.dto';
import { UpdateCrmArchivoDto } from './dto/update-crm-archivo.dto';
import { CreateContactoDto } from './dto/create-contacto.dto';
import { UpdateListaEsperaDto } from './dto/update-lista-espera.dto';
import { PortalEmailService } from './portal-email.service';
import { EnviarPortalLinkEmailDto } from './dto/enviar-portal-link-email.dto';

@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR')
@Controller('pacientes')
export class PacientesController {
  constructor(
    private readonly pacientesService: PacientesService,
    private readonly prisma: PrismaService,
    private readonly portalEmail: PortalEmailService,
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
  async suggest(
    @Query('q') q: string,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const results = await this.pacientesService.suggest(q, profesionalId);
    return results ?? [];
  }

  @Get()
  findAll(@Query('profesionalId') profesionalId?: string) {
    return this.pacientesService.obtenerListaPacientes(profesionalId);
  }

  // Log de Contactos — Lista de acción priorizada
  @Get('lista-accion')
  getListaAccion(@Query('profesionalId') profesionalId: string) {
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
  async createContacto(
    @Param('id') pacienteId: string,
    @Body() dto: CreateContactoDto,
    @Req() req: any,
  ) {
    let profesionalId = req.user?.profesionalId as string | null;

    if (!profesionalId) {
      // SECRETARIA path: resolve profesionalId from the patient record
      const paciente = await this.prisma.paciente.findUnique({
        where: { id: pacienteId },
        select: { profesionalId: true },
      });
      if (!paciente) throw new NotFoundException('Paciente no encontrado');
      profesionalId = paciente.profesionalId;
    }

    if (!profesionalId) {
      throw new BadRequestException(
        'No se pudo determinar el profesional asociado al paciente',
      );
    }

    const registradoPorId = req.user?.userId as string | undefined;
    return this.pacientesService.createContacto(
      pacienteId,
      profesionalId,
      dto,
      registradoPorId,
    );
  }

  // CRM — Obtener pacientes en lista de espera
  @Get('lista-espera')
  getListaEspera(@Query('profesionalId') profesionalId: string) {
    return this.pacientesService.getListaEspera(profesionalId);
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

  // CRM — Lista de espera para adelantar turno
  @Patch(':id/lista-espera')
  updateListaEspera(
    @Param('id') id: string,
    @Body() dto: UpdateListaEsperaDto,
  ) {
    return this.pacientesService.updateListaEspera(id, dto);
  }

  // WhatsApp — Opt-in / opt-out del paciente
  @Patch(':id/whatsapp-opt-in')
  updateWhatsappOptIn(
    @Param('id') id: string,
    @Body() dto: UpdateWhatsappOptInDto,
  ) {
    return this.pacientesService.updateWhatsappOptIn(id, dto.optIn);
  }

  // CRM — Archivar / desarchivar paciente del embudo CRM
  @Patch(':id/crm-archivo')
  updateCrmArchivo(@Param('id') id: string, @Body() dto: UpdateCrmArchivoDto) {
    return this.pacientesService.updateCrmArchivo(id, dto.archivado);
  }

  // Flujo — Clasificar o reclasificar el flujo del paciente
  @Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
  @Patch(':id/flujo')
  updateFlujo(@Param('id') id: string, @Body() dto: UpdateFlujoDto) {
    return this.pacientesService.updateFlujo(id, dto.flujo);
  }

  // Portal del Paciente — Recuperar url existente sin generar (sólo lectura)
  // Hereda @Auth('ADMIN','PROFESIONAL','SECRETARIA','FACTURADOR') del controller
  @Get(':id/portal-link')
  async obtenerPortalLink(@Param('id') id: string) {
    const result = await this.pacientesService.obtenerPortalLink(id);
    return {
      url: result.url,
      alreadyGenerated: result.alreadyGenerated,
      legacy: result.legacy ?? false,
      smtpConfigured: this.portalEmail.isSmtpConfigured(),
    };
  }

  // Portal del Paciente — Generar o recuperar el link (staff only, pacienteId desde path)
  @Post(':id/portal-link')
  async generarPortalLink(@Param('id') id: string) {
    const result = await this.pacientesService.generarPortalLink(id);
    return {
      url: result.url,
      alreadyGenerated: result.alreadyGenerated,
      smtpConfigured: this.portalEmail.isSmtpConfigured(),
    };
  }

  // Portal del Paciente — Enviar link por email; opcionalmente establece email si falta.
  // Fix (D-12): usa la url ya generada que el cliente tiene en estado, en vez de
  // re-derivarla con generarPortalLink (que devuelve url:null cuando el token ya existe).
  @Post(':id/portal-link/email')
  async enviarPortalLinkEmail(
    @Param('id') id: string,
    @Body() dto: EnviarPortalLinkEmailDto,
  ) {
    // (1) Validate the client-supplied url server-side (T-52-01). Throws 400 if
    // invalid. Returns the canonical origin+pathname — we reflect THIS into the
    // email, never the raw client string (CR-01).
    const urlSegura = this.pacientesService.validarPortalUrl(dto.url);

    // (2) Capture email if patient has none on file and one was provided.
    if (dto.email) {
      await this.pacientesService.setEmailSiFalta(id, dto.email);
    }

    // (3) Resolve the recipient from the database (not from the request body).
    const paciente = await this.prisma.paciente.findUnique({
      where: { id },
      select: { email: true, nombreCompleto: true },
    });
    if (!paciente) throw new NotFoundException('Paciente no encontrado');

    // (4) No recipient → return sin_destinatario without sending.
    if (!paciente.email) {
      return { enviado: false, motivo: 'sin_destinatario' };
    }

    // (5) Send the canonical, validated url — never re-derives it (D-12 intact)
    //     and never reflects the raw client string (CR-01).
    const enviado = await this.portalEmail.enviarLinkPortal(
      paciente.email,
      urlSegura,
      paciente.nombreCompleto,
    );

    return enviado ? { enviado: true } : { enviado: false, motivo: 'envio_fallido' };
  }
}

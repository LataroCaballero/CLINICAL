import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  UpdateVersionSchemaDto,
  CreateEntryDto,
  UpdateEntryAnswersDto,
} from './dto';
import { EstadoPlantillaHC, EstadoEntradaHC } from '@prisma/client';

@Injectable()
export class HCTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================
  // ADMIN: Template CRUD
  // =====================

  async findAllTemplates(profesionalId: string) {
    return this.prisma.historiaClinicaTemplate.findMany({
      where: { profesionalId },
      include: {
        currentVersion: true,
        _count: { select: { versions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findTemplateById(id: string, profesionalId: string) {
    const template = await this.prisma.historiaClinicaTemplate.findUnique({
      where: { id },
      include: {
        currentVersion: true,
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Template no encontrado');
    }

    if (template.profesionalId !== profesionalId) {
      throw new ForbiddenException('No tenés acceso a este template');
    }

    return template;
  }

  async createTemplate(profesionalId: string, dto: CreateTemplateDto) {
    return this.prisma.historiaClinicaTemplate.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        profesionalId,
        estado: EstadoPlantillaHC.DRAFT,
      },
    });
  }

  async updateTemplate(
    id: string,
    profesionalId: string,
    dto: UpdateTemplateDto,
  ) {
    const template = await this.findTemplateById(id, profesionalId);

    return this.prisma.historiaClinicaTemplate.update({
      where: { id: template.id },
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
      },
    });
  }

  async archiveTemplate(id: string, profesionalId: string) {
    const template = await this.findTemplateById(id, profesionalId);

    return this.prisma.historiaClinicaTemplate.update({
      where: { id: template.id },
      data: { estado: EstadoPlantillaHC.ARCHIVED },
    });
  }

  // =====================
  // ADMIN: Version CRUD
  // =====================

  async createVersion(templateId: string, profesionalId: string) {
    const template = await this.findTemplateById(templateId, profesionalId);

    // Obtener la última versión para copiar el schema
    const lastVersion =
      await this.prisma.historiaClinicaTemplateVersion.findFirst({
        where: { templateId },
        orderBy: { version: 'desc' },
      });

    const newVersionNumber = lastVersion ? lastVersion.version + 1 : 1;
    const schemaBase = lastVersion?.schema || {
      id: `template-${templateId}`,
      name: template.nombre,
      startNodeId: '',
      nodes: [],
      edges: [],
    };

    return this.prisma.historiaClinicaTemplateVersion.create({
      data: {
        templateId,
        version: newVersionNumber,
        schema: schemaBase,
      },
    });
  }

  async updateVersionSchema(
    templateId: string,
    versionId: string,
    profesionalId: string,
    dto: UpdateVersionSchemaDto,
  ) {
    await this.findTemplateById(templateId, profesionalId);

    const version = await this.prisma.historiaClinicaTemplateVersion.findUnique(
      {
        where: { id: versionId },
      },
    );

    if (!version || version.templateId !== templateId) {
      throw new NotFoundException('Versión no encontrada');
    }

    if (version.publishedAt) {
      throw new BadRequestException('No se puede editar una versión publicada');
    }

    return this.prisma.historiaClinicaTemplateVersion.update({
      where: { id: versionId },
      data: { schema: dto.schema },
    });
  }

  async publishVersion(
    templateId: string,
    versionId: string,
    profesionalId: string,
  ) {
    await this.findTemplateById(templateId, profesionalId);

    const version = await this.prisma.historiaClinicaTemplateVersion.findUnique(
      {
        where: { id: versionId },
      },
    );

    if (!version || version.templateId !== templateId) {
      throw new NotFoundException('Versión no encontrada');
    }

    if (version.publishedAt) {
      throw new BadRequestException('Esta versión ya está publicada');
    }

    // Validar que el schema tiene contenido mínimo
    const schema = version.schema as any;
    if (!schema?.startNodeId || !schema?.nodes?.length) {
      throw new BadRequestException(
        'El schema debe tener al menos un nodo inicial',
      );
    }

    // Actualizar versión y template en una transacción
    return this.prisma.$transaction(async (tx) => {
      const publishedVersion = await tx.historiaClinicaTemplateVersion.update({
        where: { id: versionId },
        data: { publishedAt: new Date() },
      });

      await tx.historiaClinicaTemplate.update({
        where: { id: templateId },
        data: {
          currentVersionId: versionId,
          estado: EstadoPlantillaHC.PUBLISHED,
        },
      });

      return publishedVersion;
    });
  }

  // =====================
  // RUNNER: Templates disponibles
  // =====================

  async findAvailableTemplates(profesionalId: string) {
    return this.prisma.historiaClinicaTemplate.findMany({
      where: {
        profesionalId,
        estado: EstadoPlantillaHC.PUBLISHED,
        currentVersionId: { not: null },
      },
      include: {
        currentVersion: {
          select: {
            id: true,
            version: true,
            schema: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async getVersionSchema(templateId: string, versionId: string) {
    const version = await this.prisma.historiaClinicaTemplateVersion.findUnique(
      {
        where: { id: versionId },
        include: {
          template: {
            select: { nombre: true },
          },
        },
      },
    );

    if (!version || version.templateId !== templateId) {
      throw new NotFoundException('Versión no encontrada');
    }

    return version;
  }

  // =====================
  // RUNNER: Entries
  // =====================

  async createEntry(
    pacienteId: string,
    profesionalId: string,
    dto: CreateEntryDto,
  ) {
    // Verificar que el template existe y es accesible
    const template = await this.prisma.historiaClinicaTemplate.findUnique({
      where: { id: dto.templateId },
    });

    if (!template || template.profesionalId !== profesionalId) {
      throw new NotFoundException('Template no encontrado');
    }

    // Verificar que la versión existe
    const version = await this.prisma.historiaClinicaTemplateVersion.findUnique(
      {
        where: { id: dto.templateVersionId },
      },
    );

    if (!version || version.templateId !== dto.templateId) {
      throw new NotFoundException('Versión no encontrada');
    }

    // Buscar o crear HistoriaClinica del paciente
    let historiaClinica = await this.prisma.historiaClinica.findFirst({
      where: { pacienteId },
    });

    if (!historiaClinica) {
      historiaClinica = await this.prisma.historiaClinica.create({
        data: {
          pacienteId,
          profesionalId,
        },
      });
    }

    // Crear entrada draft
    return this.prisma.historiaClinicaEntrada.create({
      data: {
        historiaClinicaId: historiaClinica.id,
        templateId: dto.templateId,
        templateVersionId: dto.templateVersionId,
        status: EstadoEntradaHC.DRAFT,
        answers: {},
        computed: {},
      },
      include: {
        template: { select: { nombre: true } },
        templateVersion: { select: { version: true, schema: true } },
      },
    });
  }

  async updateEntryAnswers(
    pacienteId: string,
    entryId: string,
    profesionalId: string,
    dto: UpdateEntryAnswersDto,
  ) {
    // Verificar que la entrada existe y pertenece al paciente correcto
    const entry = await this.prisma.historiaClinicaEntrada.findUnique({
      where: { id: entryId },
      include: {
        historiaClinica: true,
      },
    });

    if (!entry) {
      throw new NotFoundException('Entrada no encontrada');
    }

    if (entry.historiaClinica.pacienteId !== pacienteId) {
      throw new ForbiddenException('No tenés acceso a esta entrada');
    }

    if (entry.status === EstadoEntradaHC.FINALIZED) {
      throw new BadRequestException(
        'No se puede editar una entrada finalizada',
      );
    }

    const updateData: any = {};
    if (dto.answers !== undefined) updateData.answers = dto.answers;
    if (dto.computed !== undefined) updateData.computed = dto.computed;

    return this.prisma.historiaClinicaEntrada.update({
      where: { id: entryId },
      data: updateData,
    });
  }

  async finalizeEntry(pacienteId: string, entryId: string) {
    const entry = await this.prisma.historiaClinicaEntrada.findUnique({
      where: { id: entryId },
      include: {
        historiaClinica: true,
        templateVersion: true,
      },
    });

    if (!entry) {
      throw new NotFoundException('Entrada no encontrada');
    }

    if (entry.historiaClinica.pacienteId !== pacienteId) {
      throw new ForbiddenException('No tenés acceso a esta entrada');
    }

    if (entry.status === EstadoEntradaHC.FINALIZED) {
      throw new BadRequestException('Esta entrada ya está finalizada');
    }

    // Process special nodes
    await this.processSpecialNodes(
      pacienteId,
      entry.historiaClinica.profesionalId,
      entry.templateVersion?.schema as any,
      entry.answers as Record<string, unknown>,
      entry.computed as Record<string, unknown>,
    );

    return this.prisma.historiaClinicaEntrada.update({
      where: { id: entryId },
      data: {
        status: EstadoEntradaHC.FINALIZED,
        fecha: new Date(),
      },
      include: {
        template: { select: { nombre: true } },
      },
    });
  }

  /**
   * Process special nodes when finalizing an entry
   * - diagnosis → update Paciente.diagnostico
   * - treatment → update Paciente.tratamiento
   * - budget (with createPresupuesto) → create Presupuesto + PresupuestoItem[]
   */
  private async processSpecialNodes(
    pacienteId: string,
    profesionalId: string,
    schema: { nodes: Array<{ type: string; key: string; syncToPaciente?: boolean; createPresupuesto?: boolean; sourceNodeKey?: string }> } | null,
    answers: Record<string, unknown>,
    computed: Record<string, unknown>,
  ) {
    if (!schema?.nodes) return;

    const updates: { diagnostico?: string; tratamiento?: string } = {};

    for (const node of schema.nodes) {
      // Process diagnosis node
      if (node.type === 'diagnosis' && node.syncToPaciente !== false) {
        const diagnosisAnswer = answers[node.key];
        if (diagnosisAnswer) {
          if (typeof diagnosisAnswer === 'string') {
            updates.diagnostico = diagnosisAnswer;
          } else if (
            typeof diagnosisAnswer === 'object' &&
            diagnosisAnswer !== null &&
            'value' in diagnosisAnswer
          ) {
            updates.diagnostico = String((diagnosisAnswer as { value: string }).value);
          }
        }
      }

      // Process treatment node
      if (node.type === 'treatment' && node.syncToPaciente !== false) {
        const treatmentAnswer = answers[node.key] as
          | Array<{ tratamientoId: string; nombre: string }>
          | undefined;
        if (treatmentAnswer && Array.isArray(treatmentAnswer)) {
          updates.tratamiento = treatmentAnswer
            .map((t) => t.nombre)
            .join(', ');
        }
      }

      // Process budget node with createPresupuesto flag
      if (node.type === 'budget' && node.createPresupuesto) {
        const budgetData = computed[node.key] as
          | {
              items: Array<{
                descripcion: string;
                cantidad: number;
                precioUnitario: number;
                total: number;
              }>;
              subtotal: number;
              descuentos: number;
              total: number;
            }
          | undefined;

        if (budgetData && budgetData.items?.length > 0) {
          await this.prisma.presupuesto.create({
            data: {
              pacienteId,
              profesionalId,
              subtotal: budgetData.subtotal,
              descuentos: budgetData.descuentos || 0,
              total: budgetData.total,
              estado: 'BORRADOR',
              items: {
                create: budgetData.items.map((item, index) => ({
                  descripcion: item.descripcion,
                  cantidad: item.cantidad,
                  precioUnitario: item.precioUnitario,
                  total: item.total,
                  orden: index,
                })),
              },
            },
          });
        }
      }
    }

    // Update patient if there are changes
    if (Object.keys(updates).length > 0) {
      await this.prisma.paciente.update({
        where: { id: pacienteId },
        data: updates,
      });
    }
  }

  async findDraftEntries(pacienteId: string) {
    return this.prisma.historiaClinicaEntrada.findMany({
      where: {
        historiaClinica: { pacienteId },
        status: EstadoEntradaHC.DRAFT,
        templateId: { not: null },
      },
      include: {
        template: { select: { nombre: true } },
        templateVersion: { select: { id: true, version: true, schema: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getEntryById(pacienteId: string, entryId: string) {
    const entry = await this.prisma.historiaClinicaEntrada.findUnique({
      where: { id: entryId },
      include: {
        historiaClinica: true,
        template: { select: { nombre: true } },
        templateVersion: { select: { id: true, version: true, schema: true } },
      },
    });

    if (!entry) {
      throw new NotFoundException('Entrada no encontrada');
    }

    if (entry.historiaClinica.pacienteId !== pacienteId) {
      throw new ForbiddenException('No tenés acceso a esta entrada');
    }

    return entry;
  }

  async deleteEntry(pacienteId: string, entryId: string) {
    const entry = await this.prisma.historiaClinicaEntrada.findUnique({
      where: { id: entryId },
      include: {
        historiaClinica: true,
      },
    });

    if (!entry) {
      throw new NotFoundException('Entrada no encontrada');
    }

    if (entry.historiaClinica.pacienteId !== pacienteId) {
      throw new ForbiddenException('No tenés acceso a esta entrada');
    }

    if (entry.status === EstadoEntradaHC.FINALIZED) {
      throw new BadRequestException(
        'No se puede eliminar una entrada finalizada',
      );
    }

    await this.prisma.historiaClinicaEntrada.delete({
      where: { id: entryId },
    });

    return { message: 'Entrada eliminada correctamente' };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateEntradaDto } from './dto/crear-entrada.dto';

@Injectable()
export class HistoriaClinicaService {
  constructor(private prisma: PrismaService) {}

  async obtenerHistoriaClinica(pacienteId: string) {
    const historia = await this.prisma.historiaClinica.findFirst({
      where: { pacienteId },
      include: {
        profesional: {
          include: {
            usuario: {
              select: {
                nombre: true,
                apellido: true,
              },
            },
          },
        },
        entradas: {
          orderBy: { fecha: 'desc' },
          include: {
            template: {
              select: {
                id: true,
                nombre: true,
              },
            },
            templateVersion: {
              select: {
                id: true,
                version: true,
                schema: true,
              },
            },
          },
        },
      },
    });

    if (!historia) return [];

    const profesionalNombre = historia.profesional?.usuario
      ? `${historia.profesional.usuario.nombre} ${historia.profesional.usuario.apellido}`
      : 'Profesional';

    return historia.entradas.map((entrada) => ({
      id: entrada.id,
      fecha: entrada.fecha,
      contenido: entrada.contenido,
      templateId: entrada.templateId,
      template: entrada.template,
      templateVersion: entrada.templateVersion,
      answers: entrada.answers,
      computed: entrada.computed,
      status: entrada.status,
      profesionalNombre,
    }));
  }

  async crearEntrada(
    pacienteId: string,
    dto: CreateEntradaDto,
    profesionalIdFromJwt?: string,
  ) {
    // Resolve profesionalId fuera de la transacción para no tener queries anidadas
    let profesionalId = profesionalIdFromJwt;
    if (!profesionalId) {
      const profesional = await this.prisma.profesional.findFirst();
      if (!profesional) throw new Error('No existe ningún profesional en la base de datos');
      profesionalId = profesional.id;
    }

    // Construir contenido JSONB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contenido: any;
    if (dto.tipo === 'primera_vez') {
      contenido = {
        tipo: 'primera_vez',
        diagnostico: dto.diagnostico ?? { zonas: [], subzonas: [] },
        tratamientos: dto.tratamientos ?? [],
        comentario: dto.comentario ?? '',
        presupuestoId: dto.presupuestoId ?? null,
        presupuestoTotal: dto.presupuestoTotal ?? 0,
      };
    } else {
      contenido = { tipo: dto.tipo, texto: dto.texto ?? '' };
    }

    // Calcular strings de diagnóstico/tratamiento para actualizar el perfil
    let diagnosticoStr: string | null = null;
    let tratamientoStr: string | null = null;
    if (dto.tipo === 'primera_vez') {
      const zonas = dto.diagnostico?.zonas ?? [];
      const subzonas = dto.diagnostico?.subzonas ?? [];
      const tratamientos = dto.tratamientos ?? [];
      diagnosticoStr = zonas.length
        ? subzonas.length
          ? `${zonas.join(', ')} (${subzonas.join(', ')})`
          : zonas.join(', ')
        : null;
      tratamientoStr = tratamientos.length
        ? tratamientos.map((t) => t.nombre).join(', ')
        : null;
    }

    // Pre-fetch OS names for autorizaciones (outside tx to avoid nested queries)
    const autorizacionesMeta: Array<{ obraSocialNombre: string; autIdx: number }> = [];
    if (dto.tipo === 'primera_vez' && dto.autorizaciones?.length) {
      for (let i = 0; i < dto.autorizaciones.length; i++) {
        const aut = dto.autorizaciones[i];
        const os = await this.prisma.obraSocial.findUnique({
          where: { id: aut.obraSocialId },
          select: { nombre: true },
        });
        autorizacionesMeta.push({ obraSocialNombre: os?.nombre ?? 'Obra Social', autIdx: i });
      }
    }

    // Una sola transacción: buscar/crear historia + crear entrada + actualizar paciente
    return this.prisma.$transaction(async (tx) => {
      let historia = await tx.historiaClinica.findFirst({ where: { pacienteId } });
      if (!historia) {
        historia = await tx.historiaClinica.create({
          data: { pacienteId, profesionalId },
        });
      }

      const entrada = await tx.historiaClinicaEntrada.create({
        data: { historiaClinicaId: historia.id, contenido },
      });

      if (diagnosticoStr !== null || tratamientoStr !== null) {
        await tx.paciente.update({
          where: { id: pacienteId },
          data: {
            ...(diagnosticoStr !== null && { diagnostico: diagnosticoStr }),
            ...(tratamientoStr !== null && { tratamiento: tratamientoStr }),
          },
        });
      }

      // Inline autorizaciones de obra social
      if (dto.tipo === 'primera_vez' && dto.autorizaciones?.length) {
        for (const meta of autorizacionesMeta) {
          const autDto = dto.autorizaciones[meta.autIdx];
          const codigosStr = autDto.codigos.map((c) => `${c.codigo} - ${c.descripcion}`).join(', ');

          await tx.autorizacionObraSocial.create({
            data: {
              pacienteId,
              obraSocialId: autDto.obraSocialId,
              profesionalId,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              codigos: autDto.codigos as any,
              estado: 'PENDIENTE',
            },
          });

          await tx.contactoLog.create({
            data: {
              pacienteId,
              profesionalId,
              tipo: 'SISTEMA',
              nota: `Códigos pendientes de autorización con ${meta.obraSocialNombre}: ${codigosStr}`,
            },
          });
        }
      }

      return entrada;
    });
  }
}

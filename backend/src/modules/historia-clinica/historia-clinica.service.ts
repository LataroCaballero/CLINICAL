import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

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

  async crearEntrada(pacienteId: string, contenidoTexto: string) {
    const profesional = await this.prisma.profesional.findFirst();

    if (!profesional) {
      throw new Error('No existe ningún profesional en la base de datos');
    }

    const profesionalId = profesional.id;

    // 1. Buscar o crear historia clínica
    let historia = await this.prisma.historiaClinica.findFirst({
      where: { pacienteId },
    });

    if (!historia) {
      historia = await this.prisma.historiaClinica.create({
        data: {
          pacienteId,
          profesionalId,
        },
      });
    }

    // 2. Crear entrada
    return this.prisma.historiaClinicaEntrada.create({
      data: {
        historiaClinicaId: historia.id,
        contenido: {
          texto: contenidoTexto,
        },
      },
    });
  }
}

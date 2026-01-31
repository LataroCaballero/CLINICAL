import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/src/prisma/prisma.service';
import { CreateMensajeDto } from './dto/create-mensaje.dto';
import { RolUsuario } from '@prisma/client';

interface Scope {
  userId: string;
  rol: RolUsuario;
  profesionalId: string | null;
}

@Injectable()
export class MensajesInternosService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene la lista de chats (pacientes con mensajes) con el ultimo mensaje y contadores
   */
  async findChats(scope: Scope) {
    // Profesionales solo ven sus pacientes, secretarias/admin ven todos
    const whereClause =
      scope.rol === RolUsuario.PROFESIONAL
        ? { profesionalId: scope.profesionalId }
        : scope.profesionalId
          ? { profesionalId: scope.profesionalId }
          : {};

    const pacientes = await this.prisma.paciente.findMany({
      where: {
        ...whereClause,
        mensajesInternos: { some: {} },
      },
      select: {
        id: true,
        nombreCompleto: true,
        fotoUrl: true,
        mensajesInternos: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            mensaje: true,
            prioridad: true,
            createdAt: true,
            autor: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
              },
            },
          },
        },
      },
      orderBy: {
        mensajesInternos: {
          _count: 'desc',
        },
      },
    });

    // Contar mensajes no leidos por cada paciente
    const result = await Promise.all(
      pacientes.map(async (paciente) => {
        const unreadCount = await this.prisma.mensajeInterno.count({
          where: {
            pacienteId: paciente.id,
            lecturas: {
              none: { usuarioId: scope.userId },
            },
          },
        });

        const unreadAlta = await this.prisma.mensajeInterno.count({
          where: {
            pacienteId: paciente.id,
            prioridad: 'ALTA',
            lecturas: {
              none: { usuarioId: scope.userId },
            },
          },
        });

        return {
          ...paciente,
          ultimoMensaje: paciente.mensajesInternos[0] || null,
          unreadCount,
          unreadAlta,
        };
      }),
    );

    // Ordenar por ultimo mensaje
    return result.sort((a, b) => {
      const dateA = a.ultimoMensaje?.createdAt || new Date(0);
      const dateB = b.ultimoMensaje?.createdAt || new Date(0);
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }

  /**
   * Obtiene los mensajes de un paciente especifico
   */
  async findByPaciente(pacienteId: string, userId: string) {
    const mensajes = await this.prisma.mensajeInterno.findMany({
      where: { pacienteId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        mensaje: true,
        prioridad: true,
        createdAt: true,
        autorId: true,
        autor: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            fotoUrl: true,
            rol: true,
          },
        },
        lecturas: {
          where: { usuarioId: userId },
          select: { leidoAt: true },
        },
      },
    });

    return mensajes.map((m) => ({
      ...m,
      leido: m.lecturas.length > 0,
      esPropio: m.autorId === userId,
    }));
  }

  /**
   * Crea un nuevo mensaje
   */
  async create(dto: CreateMensajeDto, autorId: string) {
    // Verificar que el paciente existe
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: dto.pacienteId },
      select: { id: true, nombreCompleto: true },
    });

    if (!paciente) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const mensaje = await this.prisma.mensajeInterno.create({
      data: {
        mensaje: dto.mensaje,
        prioridad: dto.prioridad,
        autorId,
        pacienteId: dto.pacienteId,
      },
      include: {
        autor: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            fotoUrl: true,
          },
        },
      },
    });

    // Marcar como leido por el autor automaticamente
    await this.prisma.mensajeLectura.create({
      data: {
        mensajeId: mensaje.id,
        usuarioId: autorId,
      },
    });

    return mensaje;
  }

  /**
   * Marca un mensaje como leido
   */
  async marcarLeido(mensajeId: string, usuarioId: string) {
    const mensaje = await this.prisma.mensajeInterno.findUnique({
      where: { id: mensajeId },
    });

    if (!mensaje) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    // Upsert para evitar duplicados
    await this.prisma.mensajeLectura.upsert({
      where: {
        mensajeId_usuarioId: {
          mensajeId,
          usuarioId,
        },
      },
      update: {},
      create: {
        mensajeId,
        usuarioId,
      },
    });

    return { success: true };
  }

  /**
   * Marca todos los mensajes de un paciente como leidos
   */
  async marcarTodosLeidos(pacienteId: string, usuarioId: string) {
    // Obtener todos los mensajes no leidos de este paciente
    const mensajesNoLeidos = await this.prisma.mensajeInterno.findMany({
      where: {
        pacienteId,
        lecturas: {
          none: { usuarioId },
        },
      },
      select: { id: true },
    });

    // Crear lecturas para todos
    if (mensajesNoLeidos.length > 0) {
      await this.prisma.mensajeLectura.createMany({
        data: mensajesNoLeidos.map((m) => ({
          mensajeId: m.id,
          usuarioId,
        })),
        skipDuplicates: true,
      });
    }

    return { marcados: mensajesNoLeidos.length };
  }

  /**
   * Obtiene contadores de mensajes no leidos
   */
  async getContadoresNoLeidos(scope: Scope) {
    // Filtrar por pacientes accesibles segun el rol
    const whereClause =
      scope.rol === RolUsuario.PROFESIONAL
        ? { profesionalId: scope.profesionalId }
        : scope.profesionalId
          ? { profesionalId: scope.profesionalId }
          : {};

    // Total de mensajes no leidos
    const total = await this.prisma.mensajeInterno.count({
      where: {
        paciente: whereClause,
        lecturas: {
          none: { usuarioId: scope.userId },
        },
      },
    });

    // Mensajes de prioridad ALTA no leidos
    const alta = await this.prisma.mensajeInterno.count({
      where: {
        paciente: whereClause,
        prioridad: 'ALTA',
        lecturas: {
          none: { usuarioId: scope.userId },
        },
      },
    });

    // Contadores por paciente
    const porPaciente = await this.prisma.mensajeInterno.groupBy({
      by: ['pacienteId'],
      where: {
        paciente: whereClause,
        lecturas: {
          none: { usuarioId: scope.userId },
        },
      },
      _count: true,
    });

    const porPacienteMap: Record<string, number> = {};
    porPaciente.forEach((p) => {
      porPacienteMap[p.pacienteId] = p._count;
    });

    return {
      total,
      alta,
      porPaciente: porPacienteMap,
    };
  }
}

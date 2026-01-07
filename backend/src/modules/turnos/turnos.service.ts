import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { CobrarTurnoDto } from './dto/cobrar-turno.dto';
import { CreateCirugiaTurnoDto } from './dto/create-cirugia-turno.dto';
import {
  EstadoTurno,
  RolUsuario,
  TipoMovimiento,
  EstadoCirugia,
} from '@prisma/client';
import { getDayRange } from '@/src/common/utils/date-range';
import { ReprogramarTurnoDto } from './dto/reprogramar-turno.dto';
import { CuentasCorrientesService } from '../cuentas-corrientes/cuentas-corrientes.service';

@Injectable()
export class TurnosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cuentasCorrientesService: CuentasCorrientesService,
  ) {}

  async crearTurno(dto: CreateTurnoDto) {
    const inicio = new Date(dto.inicio);
    if (Number.isNaN(inicio.getTime())) {
      throw new BadRequestException('Fecha/hora de inicio inválida.');
    }

    // 1) Validar existencia de entidades (MVP: mínimo indispensable)
    const [paciente, profesional, tipoTurno] = await Promise.all([
      this.prisma.paciente.findUnique({
        where: { id: dto.pacienteId },
        select: { id: true },
      }),
      this.prisma.profesional.findUnique({
        where: { id: dto.profesionalId },
        select: { id: true },
      }),
      this.prisma.tipoTurno.findUnique({
        where: { id: dto.tipoTurnoId },
        select: { id: true, duracionDefault: true },
      }),
    ]);

    if (!paciente) throw new NotFoundException('Paciente no encontrado.');
    if (!profesional) throw new NotFoundException('Profesional no encontrado.');
    if (!tipoTurno) throw new NotFoundException('Tipo de turno no encontrado.');

    // 2) Calcular fin (MVP) - usa duración del DTO o la default del tipo de turno
    const duracionMin = dto.duracionMinutos ?? tipoTurno.duracionDefault ?? 30;
    if (duracionMin <= 0) {
      throw new BadRequestException('La duración del turno es inválida.');
    }

    const fin = new Date(inicio.getTime() + duracionMin * 60 * 1000);

    // 3) Validar solapamiento (para ese profesional)
    const turnoSolapado = await this.prisma.turno.findFirst({
      where: {
        profesionalId: dto.profesionalId,
        // Excluir cancelados del conflicto (MVP)
        estado: { not: EstadoTurno.CANCELADO },
        // Overlap: existente.inicio < nuevoFin AND existente.fin > nuevoInicio
        inicio: { lt: fin },
        fin: { gt: inicio },
      },
      select: { id: true, inicio: true, fin: true, estado: true },
    });

    if (turnoSolapado) {
      throw new BadRequestException(
        `El profesional ya tiene un turno que se solapa en ese horario (${turnoSolapado.estado}).`,
      );
    }

    // 4) Crear turno
    return this.prisma.turno.create({
      data: {
        pacienteId: dto.pacienteId,
        profesionalId: dto.profesionalId,
        tipoTurnoId: dto.tipoTurnoId,
        inicio,
        fin,
        estado: dto.estado ?? EstadoTurno.PENDIENTE,
        observaciones: dto.observaciones?.trim() || null,

        // MVP: no tocamos automatizaciones / cirugías / finanzas
        // notificacionEnviada queda false por default
        // esCirugia queda false por default
      },
      include: {
        paciente: { select: { id: true, nombreCompleto: true } },
        profesional: {
          include: { usuario: { select: { nombre: true, apellido: true } } },
        },
        tipoTurno: {
          select: { id: true, nombre: true, duracionDefault: true },
        },
      },
    });
  }

  async obtenerTurnosPorPaciente(pacienteId: string) {
    const ahora = new Date();

    return this.prisma.turno.findMany({
      where: {
        pacienteId,
        estado: { not: EstadoTurno.CANCELADO },
        fin: { gte: ahora },
      },
      orderBy: {
        inicio: 'asc',
      },
      take: 10,
      select: {
        id: true,
        inicio: true,
        fin: true,
        estado: true,
        observaciones: true,
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
        tipoTurno: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });
  }

  async cancelarTurno(turnoId: string) {
    const turno = await this.prisma.turno.findUnique({
      where: { id: turnoId },
      select: { id: true, estado: true },
    });

    if (!turno) {
      throw new NotFoundException('Turno no encontrado.');
    }

    if (
      turno.estado === EstadoTurno.CANCELADO ||
      turno.estado === EstadoTurno.FINALIZADO
    ) {
      throw new BadRequestException(
        `No se puede cancelar un turno en estado ${turno.estado}.`,
      );
    }

    return this.prisma.turno.update({
      where: { id: turnoId },
      data: {
        estado: EstadoTurno.CANCELADO,
      },
    });
  }

  async finalizarTurno(turnoId: string) {
    const turno = await this.prisma.turno.findUnique({
      where: { id: turnoId },
      select: { id: true, estado: true },
    });

    if (!turno) {
      throw new NotFoundException('Turno no encontrado.');
    }

    if (
      turno.estado === EstadoTurno.CANCELADO ||
      turno.estado === EstadoTurno.FINALIZADO
    ) {
      throw new BadRequestException(
        `No se puede finalizar un turno en estado ${turno.estado}.`,
      );
    }

    return this.prisma.turno.update({
      where: { id: turnoId },
      data: {
        estado: EstadoTurno.FINALIZADO,
      },
    });
  }

  async confirmarTurno(turnoId: string) {
    const turno = await this.prisma.turno.findUnique({
      where: { id: turnoId },
      select: { id: true, estado: true },
    });

    if (!turno) {
      throw new NotFoundException('Turno no encontrado.');
    }

    if (
      turno.estado === EstadoTurno.CANCELADO ||
      turno.estado === EstadoTurno.FINALIZADO
    ) {
      throw new BadRequestException(
        `No se puede confirmar un turno en estado ${turno.estado}.`,
      );
    }

    return this.prisma.turno.update({
      where: { id: turnoId },
      data: {
        estado: EstadoTurno.CONFIRMADO,
      },
    });
  }

  async obtenerAgendaDiaria(profesionalId: string, fechaISO: string) {
    // Validate date format (yyyy-MM-dd)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) {
      throw new BadRequestException('Fecha inválida. Use formato yyyy-MM-dd.');
    }

    // Pass the string directly to avoid UTC interpretation issues
    const { start, end } = getDayRange(fechaISO);

    return this.prisma.turno.findMany({
      where: {
        profesionalId,
        inicio: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        inicio: 'asc',
      },
      select: {
        id: true,
        inicio: true,
        fin: true,
        estado: true,
        observaciones: true,
        paciente: {
          select: {
            id: true,
            nombreCompleto: true,
          },
        },
        tipoTurno: {
          select: {
            id: true,
            nombre: true,
            duracionDefault: true,
          },
        },
      },
    });
  }

  async obtenerTurnosPorRango(
    profesionalId: string,
    desdeISO: string,
    hastaISO: string,
  ) {
    // Validate date format (yyyy-MM-dd)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(desdeISO) || !dateRegex.test(hastaISO)) {
      throw new BadRequestException(
        'Fechas inválidas. Use formato yyyy-MM-dd.',
      );
    }

    // Parse dates manually to avoid UTC interpretation issues
    const { start: desde } = getDayRange(desdeISO);
    const { end: hasta } = getDayRange(hastaISO);

    return this.prisma.turno.findMany({
      where: {
        profesionalId,
        inicio: {
          gte: desde,
          lte: hasta,
        },
        // MVP: incluimos cancelados para contexto visual
        // si luego querés ocultarlos en UI, se filtra ahí
      },
      orderBy: {
        inicio: 'asc',
      },
      select: {
        id: true,
        inicio: true,
        fin: true,
        estado: true,
        observaciones: true,
        paciente: {
          select: {
            id: true,
            nombreCompleto: true,
          },
        },
        tipoTurno: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });
  }
  async reprogramarTurno(turnoId: string, dto: ReprogramarTurnoDto) {
    const inicio = new Date(dto.inicio);
    const fin = new Date(dto.fin);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      throw new BadRequestException('Fechas inválidas.');
    }

    if (fin <= inicio) {
      throw new BadRequestException(
        'La fecha/hora fin debe ser mayor a inicio.',
      );
    }

    const turno = await this.prisma.turno.findUnique({
      where: { id: turnoId },
      select: { id: true, profesionalId: true, estado: true },
    });

    if (!turno) throw new NotFoundException('Turno no encontrado.');

    // MVP: no reprogramar cancelados/finalizados (evita inconsistencias)
    if (
      turno.estado === EstadoTurno.CANCELADO ||
      turno.estado === EstadoTurno.FINALIZADO
    ) {
      throw new BadRequestException(
        `No se puede reprogramar un turno en estado ${turno.estado}.`,
      );
    }

    // Solapamiento (excluyendo el propio turno)
    const solapado = await this.prisma.turno.findFirst({
      where: {
        id: { not: turnoId },
        profesionalId: turno.profesionalId,
        estado: { not: EstadoTurno.CANCELADO },
        inicio: { lt: fin },
        fin: { gt: inicio },
      },
      select: { id: true, inicio: true, fin: true, estado: true },
    });

    if (solapado) {
      throw new BadRequestException(
        'El profesional ya tiene un turno que se solapa con ese horario.',
      );
    }

    return this.prisma.turno.update({
      where: { id: turnoId },
      data: { inicio, fin },
    });
  }

  async cobrarTurno(turnoId: string, dto: CobrarTurnoDto) {
    const turno = await this.prisma.turno.findUnique({
      where: { id: turnoId },
      select: { id: true, pacienteId: true, estado: true },
    });

    if (!turno) {
      throw new NotFoundException('Turno no encontrado.');
    }

    if (turno.estado === EstadoTurno.CANCELADO) {
      throw new BadRequestException('No se puede cobrar un turno cancelado.');
    }

    // Registrar el pago en cuenta corriente
    await this.cuentasCorrientesService.createMovimiento(turno.pacienteId, {
      monto: dto.monto,
      tipo: TipoMovimiento.PAGO,
      descripcion: dto.descripcion || 'Pago de turno',
      turnoId: turno.id,
    });

    return { success: true, message: 'Cobro registrado correctamente.' };
  }

  async findAll(
    scope: { profesionalId: string | null; rol: RolUsuario },
    pacienteId?: string,
  ) {
    if (scope.profesionalId) {
      const exists = await this.prisma.profesional.findUnique({
        where: { id: scope.profesionalId },
        select: { id: true },
      });

      if (!exists) {
        throw new NotFoundException('Profesional no encontrado');
      }
    }

    const where: Record<string, unknown> = {};

    if (scope.profesionalId) {
      where.profesionalId = scope.profesionalId;
    }

    if (pacienteId) {
      where.pacienteId = pacienteId;
    }

    return this.prisma.turno.findMany({
      where,
      orderBy: { inicio: 'asc' },
      include: {
        paciente: {
          select: { id: true, nombreCompleto: true },
        },
        profesional: {
          include: { usuario: { select: { nombre: true, apellido: true } } },
        },
        tipoTurno: {
          select: { id: true, nombre: true, duracionDefault: true },
        },
      },
    });
  }

  async crearTurnoCirugia(dto: CreateCirugiaTurnoDto) {
    // 1. Validar paciente y profesional
    const [paciente, profesional] = await Promise.all([
      this.prisma.paciente.findUnique({
        where: { id: dto.pacienteId },
        select: { id: true },
      }),
      this.prisma.profesional.findUnique({
        where: { id: dto.profesionalId },
        select: { id: true },
      }),
    ]);

    if (!paciente) throw new NotFoundException('Paciente no encontrado.');
    if (!profesional) throw new NotFoundException('Profesional no encontrado.');

    // 2. Buscar el tipo de turno de cirugía (esCirugia = true)
    let tipoTurnoCirugia = await this.prisma.tipoTurno.findFirst({
      where: { esCirugia: true },
    });

    // Si no existe, crearlo automáticamente
    if (!tipoTurnoCirugia) {
      tipoTurnoCirugia = await this.prisma.tipoTurno.create({
        data: {
          nombre: 'Cirugía',
          descripcion: 'Turno de cirugía',
          duracionDefault: 120,
          esCirugia: true,
        },
      });
    }

    // 3. Calcular fecha e inicio (parseando manualmente para evitar problemas de timezone)
    const [year, month, day] = dto.fecha.split('-').map(Number);
    const [hours, minutes] = dto.horaInicio.split(':').map(Number);

    // Crear fecha a medianoche en zona local
    const fecha = new Date(year, month - 1, day, 0, 0, 0, 0);

    // Crear inicio con hora específica en zona local
    const inicio = new Date(year, month - 1, day, hours, minutes, 0, 0);

    const duracionMin =
      dto.duracionMinutos ?? tipoTurnoCirugia.duracionDefault ?? 120;
    const fin = new Date(inicio.getTime() + duracionMin * 60 * 1000);

    // 4. Validar solapamiento
    const turnoSolapado = await this.prisma.turno.findFirst({
      where: {
        profesionalId: dto.profesionalId,
        estado: { not: EstadoTurno.CANCELADO },
        inicio: { lt: fin },
        fin: { gt: inicio },
      },
      select: { id: true },
    });

    if (turnoSolapado) {
      throw new BadRequestException(
        'Ya existe un turno que se solapa con ese horario.',
      );
    }

    // 5. Crear Cirugia y Turno en transacción
    return this.prisma.$transaction(async (tx) => {
      // Crear la cirugía
      const cirugia = await tx.cirugia.create({
        data: {
          pacienteId: dto.pacienteId,
          profesionalId: dto.profesionalId,
          fecha,
          horaEstimadaInicio: dto.horaInicio,
          duracion: duracionMin,
          procedimiento: dto.procedimiento,
          descripcion: dto.descripcion,
          tipoAnestesia: dto.tipoAnestesia,
          quirofano: dto.quirofano,
          ayudante: dto.ayudante,
          anestesiologo: dto.anestesiologo,
          notasPreoperatorias: dto.notasPreoperatorias,
          estado: EstadoCirugia.PROGRAMADA,
        },
      });

      // Crear el turno asociado
      const turno = await tx.turno.create({
        data: {
          pacienteId: dto.pacienteId,
          profesionalId: dto.profesionalId,
          tipoTurnoId: tipoTurnoCirugia.id,
          inicio,
          fin,
          estado: EstadoTurno.PENDIENTE,
          esCirugia: true,
          cirugiaId: cirugia.id,
          observaciones: dto.notasPreoperatorias,
        },
        include: {
          paciente: { select: { id: true, nombreCompleto: true } },
          profesional: {
            include: { usuario: { select: { nombre: true, apellido: true } } },
          },
          tipoTurno: { select: { id: true, nombre: true } },
          cirugia: true,
        },
      });

      return turno;
    });
  }
}

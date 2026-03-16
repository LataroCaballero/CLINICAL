import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CuentasCorrientesService } from '../cuentas-corrientes/cuentas-corrientes.service';
import { PresupuestoPdfService } from './presupuesto-pdf.service';
import { CreatePresupuestoDto } from './dto/create-presupuesto.dto';
import { EstadoPresupuesto, TipoMovimiento, EtapaCRM, PrioridadMensaje } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PresupuestosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cuentasCorrientesService: CuentasCorrientesService,
    private readonly pdfService: PresupuestoPdfService,
  ) {}

  /**
   * Crea un presupuesto con sus items
   */
  async create(dto: CreatePresupuestoDto) {
    // Validar que existan paciente y profesional
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

    if (!paciente) throw new NotFoundException('Paciente no encontrado');
    if (!profesional) throw new NotFoundException('Profesional no encontrado');

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(
        'El presupuesto debe tener al menos un item',
      );
    }

    // Calcular totales
    const itemsConTotal = dto.items.map((item, index) => ({
      descripcion: item.descripcion,
      precioTotal: item.precioTotal,
      orden: index,
    }));

    const subtotal = itemsConTotal.reduce((acc, item) => acc + item.precioTotal, 0);
    const descuentos = dto.descuentos || 0;
    const total = subtotal - descuentos;

    // Crear presupuesto con items
    const presupuesto = await this.prisma.presupuesto.create({
      data: {
        pacienteId: dto.pacienteId,
        profesionalId: dto.profesionalId,
        subtotal,
        descuentos,
        total,
        moneda: dto.moneda ?? 'ARS',
        fechaValidez: dto.fechaValidez ? new Date(dto.fechaValidez) : null,
        estado: EstadoPresupuesto.BORRADOR,
        items: {
          create: itemsConTotal,
        },
      },
      include: {
        items: { orderBy: { orden: 'asc' } },
        paciente: { select: { id: true, nombreCompleto: true } },
      },
    });

    return this.formatPresupuesto(presupuesto);
  }

  /**
   * Lista presupuestos de un paciente
   */
  async findByPaciente(pacienteId: string) {
    const presupuestos = await this.prisma.presupuesto.findMany({
      where: { pacienteId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { orderBy: { orden: 'asc' } },
        profesional: {
          include: {
            usuario: { select: { nombre: true, apellido: true } },
          },
        },
      },
    });

    return presupuestos.map(this.formatPresupuesto);
  }

  /**
   * Obtiene un presupuesto por ID
   */
  async findOne(id: string) {
    const presupuesto = await this.prisma.presupuesto.findUnique({
      where: { id },
      include: {
        items: { orderBy: { orden: 'asc' } },
        paciente: { select: { id: true, nombreCompleto: true } },
        profesional: {
          include: {
            usuario: { select: { nombre: true, apellido: true } },
          },
        },
      },
    });

    if (!presupuesto) {
      throw new NotFoundException('Presupuesto no encontrado');
    }

    return this.formatPresupuesto(presupuesto);
  }

  /**
   * Acepta un presupuesto y crea el cargo en cuenta corriente
   */
  async aceptar(id: string) {
    const presupuesto = await this.prisma.presupuesto.findUnique({
      where: { id },
      select: {
        id: true,
        pacienteId: true,
        total: true,
        estado: true,
      },
    });

    if (!presupuesto) {
      throw new NotFoundException('Presupuesto no encontrado');
    }

    if (
      presupuesto.estado !== EstadoPresupuesto.BORRADOR &&
      presupuesto.estado !== EstadoPresupuesto.ENVIADO
    ) {
      throw new BadRequestException(
        `No se puede aceptar un presupuesto en estado ${presupuesto.estado}`,
      );
    }

    // Crear cargo en cuenta corriente
    const movimiento = await this.cuentasCorrientesService.createMovimiento(
      presupuesto.pacienteId,
      {
        monto: Number(presupuesto.total),
        tipo: TipoMovimiento.CARGO,
        descripcion: `Presupuesto aceptado`,
        presupuestoId: presupuesto.id,
      },
    );

    // Actualizar estado del presupuesto y etapaCRM del paciente
    const [updated] = await this.prisma.$transaction([
      this.prisma.presupuesto.update({
        where: { id },
        data: {
          estado: EstadoPresupuesto.ACEPTADO,
          fechaAceptado: new Date(),
          cargoMovimientoId: movimiento.id,
        },
        include: {
          items: { orderBy: { orden: 'asc' } },
          paciente: { select: { id: true, nombreCompleto: true } },
        },
      }),
      this.prisma.paciente.update({
        where: { id: presupuesto.pacienteId },
        data: { etapaCRM: EtapaCRM.CONFIRMADO },
      }),
    ]);

    return this.formatPresupuesto(updated);
  }

  /**
   * Marca un presupuesto como ENVIADO y actualiza etapaCRM del paciente
   */
  async marcarEnviado(id: string) {
    const presupuesto = await this.prisma.presupuesto.findUnique({
      where: { id },
      select: { id: true, pacienteId: true, estado: true, tokenAceptacion: true },
    });

    if (!presupuesto) throw new NotFoundException('Presupuesto no encontrado');

    if (presupuesto.estado !== EstadoPresupuesto.BORRADOR) {
      throw new BadRequestException(
        'Solo se puede marcar como enviado un presupuesto en estado BORRADOR',
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.presupuesto.update({
        where: { id },
        data: {
          estado: EstadoPresupuesto.ENVIADO,
          fechaEnviado: new Date(),
          tokenAceptacion: presupuesto.tokenAceptacion ?? crypto.randomUUID(),
        },
        include: {
          items: { orderBy: { orden: 'asc' } },
          paciente: { select: { id: true, nombreCompleto: true } },
        },
      }),
      this.prisma.paciente.update({
        where: { id: presupuesto.pacienteId },
        data: { etapaCRM: EtapaCRM.PRESUPUESTO_ENVIADO },
      }),
    ]);

    return this.formatPresupuesto(updated);
  }

  /**
   * Rechaza un presupuesto y puede mover al paciente a PERDIDO
   */
  async rechazar(id: string, dto: { motivoRechazo?: string }) {
    const presupuesto = await this.prisma.presupuesto.findUnique({
      where: { id },
      select: { id: true, pacienteId: true, estado: true },
    });

    if (!presupuesto) throw new NotFoundException('Presupuesto no encontrado');

    if (
      presupuesto.estado !== EstadoPresupuesto.BORRADOR &&
      presupuesto.estado !== EstadoPresupuesto.ENVIADO
    ) {
      throw new BadRequestException(
        `No se puede rechazar un presupuesto en estado ${presupuesto.estado}`,
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.presupuesto.update({
        where: { id },
        data: {
          estado: EstadoPresupuesto.RECHAZADO,
          fechaRechazado: new Date(),
          motivoRechazo: dto.motivoRechazo ?? null,
        },
        include: {
          items: { orderBy: { orden: 'asc' } },
          paciente: { select: { id: true, nombreCompleto: true } },
        },
      }),
      this.prisma.paciente.update({
        where: { id: presupuesto.pacienteId },
        data: { etapaCRM: EtapaCRM.PERDIDO },
      }),
    ]);

    return this.formatPresupuesto(updated);
  }

  /**
   * Elimina un presupuesto (solo si está en BORRADOR)
   */
  async remove(id: string) {
    const presupuesto = await this.prisma.presupuesto.findUnique({
      where: { id },
      select: { id: true, estado: true },
    });

    if (!presupuesto) {
      throw new NotFoundException('Presupuesto no encontrado');
    }

    if (presupuesto.estado !== EstadoPresupuesto.BORRADOR) {
      throw new BadRequestException(
        'Solo se pueden eliminar presupuestos en estado BORRADOR',
      );
    }

    await this.prisma.$transaction([
      this.prisma.presupuestoItem.deleteMany({
        where: { presupuestoId: id },
      }),
      this.prisma.presupuesto.delete({
        where: { id },
      }),
    ]);

    return { message: 'Presupuesto eliminado' };
  }

  /**
   * GET /presupuestos/:id/pdf — genera y retorna el PDF como buffer
   */
  async generatePdf(id: string): Promise<{ buffer: Buffer; filename: string }> {
    const presupuesto = await this.prisma.presupuesto.findUnique({
      where: { id },
      include: {
        items: { orderBy: { orden: 'asc' } },
        paciente: { select: { id: true, nombreCompleto: true, dni: true, email: true, telefono: true } },
        profesional: {
          include: {
            usuario: { select: { nombre: true, apellido: true } },
            configClinica: true,
          },
        },
      },
    });
    if (!presupuesto) throw new NotFoundException('Presupuesto no encontrado');

    const config = (presupuesto.profesional as any).configClinica;
    const pdfBuffer = await this.pdfService.generatePdfBuffer({
      id: presupuesto.id,
      moneda: presupuesto.moneda,
      fechaValidez: presupuesto.fechaValidez,
      createdAt: presupuesto.createdAt,
      items: presupuesto.items.map((i: any) => ({
        descripcion: i.descripcion,
        precioTotal: Number(i.precioTotal),
      })),
      subtotal: Number(presupuesto.subtotal),
      descuentos: Number(presupuesto.descuentos),
      total: Number(presupuesto.total),
      paciente: {
        nombreCompleto: presupuesto.paciente.nombreCompleto,
        dni: (presupuesto.paciente as any).dni,
        email: (presupuesto.paciente as any).email,
        telefono: (presupuesto.paciente as any).telefono,
      },
      config: {
        nombreClinica: config?.nombreClinica,
        logoUrl: config?.logoUrl,
        direccion: config?.direccion,
        telefono: config?.telefono,
        emailContacto: config?.emailContacto,
        web: config?.web,
        piePaginaTexto: config?.piePaginaTexto,
      },
      profesional: {
        nombre: presupuesto.profesional.usuario.nombre,
        apellido: presupuesto.profesional.usuario.apellido,
      },
    });

    return { buffer: pdfBuffer, filename: `presupuesto-${id.slice(0, 8)}.pdf` };
  }

  /**
   * Busca presupuesto por token de aceptación (para página pública)
   */
  async findByToken(token: string) {
    const presupuesto = await this.prisma.presupuesto.findUnique({
      where: { tokenAceptacion: token },
      include: {
        items: { orderBy: { orden: 'asc' } },
        paciente: { select: { nombreCompleto: true } },
        profesional: {
          include: {
            configClinica: true,
            usuario: { select: { nombre: true, apellido: true } },
          },
        },
      },
    });
    if (!presupuesto) throw new NotFoundException('Presupuesto no encontrado o link expirado');
    if (presupuesto.estado !== EstadoPresupuesto.ENVIADO) {
      throw new BadRequestException('Este presupuesto ya fue procesado');
    }
    return this.formatPresupuesto(presupuesto);
  }

  /**
   * Acepta presupuesto desde página pública (sin auth)
   */
  async aceptarByToken(token: string) {
    const presupuesto = await this.prisma.presupuesto.findUnique({
      where: { tokenAceptacion: token },
      select: { id: true, pacienteId: true, total: true, estado: true, profesionalId: true },
    });
    if (!presupuesto) throw new NotFoundException('Presupuesto no encontrado');
    if (presupuesto.estado !== EstadoPresupuesto.ENVIADO) {
      throw new BadRequestException('Este presupuesto ya fue procesado');
    }

    // Get profesional's usuarioId for the notification autor
    const profesional = await this.prisma.profesional.findUnique({
      where: { id: presupuesto.profesionalId },
      select: { usuarioId: true },
    });
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: presupuesto.pacienteId },
      select: { nombreCompleto: true },
    });

    // Create cargo in cuenta corriente
    const movimiento = await this.cuentasCorrientesService.createMovimiento(
      presupuesto.pacienteId,
      {
        monto: Number(presupuesto.total),
        tipo: TipoMovimiento.CARGO,
        descripcion: 'Presupuesto aceptado',
        presupuestoId: presupuesto.id,
      },
    );

    await this.prisma.$transaction([
      this.prisma.presupuesto.update({
        where: { id: presupuesto.id },
        data: {
          estado: EstadoPresupuesto.ACEPTADO,
          fechaAceptado: new Date(),
          cargoMovimientoId: movimiento.id,
        },
      }),
      this.prisma.paciente.update({
        where: { id: presupuesto.pacienteId },
        data: { etapaCRM: EtapaCRM.CONFIRMADO },
      }),
      this.prisma.mensajeInterno.create({
        data: {
          mensaje: `PRESUPUESTO ACEPTADO — ${paciente?.nombreCompleto ?? 'Paciente'} aceptó el presupuesto por $${Number(presupuesto.total).toLocaleString('es-AR')}. Contactar para agendar cirugía.`,
          prioridad: PrioridadMensaje.ALTA,
          autorId: profesional!.usuarioId,
          pacienteId: presupuesto.pacienteId,
        },
      }),
    ]);

    return { message: 'Presupuesto aceptado exitosamente' };
  }

  /**
   * Rechaza presupuesto desde página pública (sin auth)
   */
  async rechazarByToken(token: string, motivoRechazo?: string) {
    const presupuesto = await this.prisma.presupuesto.findUnique({
      where: { tokenAceptacion: token },
      select: { id: true, pacienteId: true, estado: true, profesionalId: true },
    });
    if (!presupuesto) throw new NotFoundException('Presupuesto no encontrado');
    if (presupuesto.estado !== EstadoPresupuesto.ENVIADO) {
      throw new BadRequestException('Este presupuesto ya fue procesado');
    }

    const profesional = await this.prisma.profesional.findUnique({
      where: { id: presupuesto.profesionalId },
      select: { usuarioId: true },
    });
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: presupuesto.pacienteId },
      select: { nombreCompleto: true },
    });

    const motivoText = motivoRechazo ?? 'Sin motivo especificado';

    await this.prisma.$transaction([
      this.prisma.presupuesto.update({
        where: { id: presupuesto.id },
        data: {
          estado: EstadoPresupuesto.RECHAZADO,
          fechaRechazado: new Date(),
          motivoRechazo: motivoText,
        },
      }),
      this.prisma.paciente.update({
        where: { id: presupuesto.pacienteId },
        data: { etapaCRM: EtapaCRM.PERDIDO },
      }),
      this.prisma.mensajeInterno.create({
        data: {
          mensaje: `Presupuesto rechazado — ${paciente?.nombreCompleto ?? 'Paciente'} rechazó el presupuesto. Motivo: "${motivoText}". Oportunidad de recuperar al paciente.`,
          prioridad: PrioridadMensaje.MEDIA,
          autorId: profesional!.usuarioId,
          pacienteId: presupuesto.pacienteId,
        },
      }),
    ]);

    return { message: 'Presupuesto rechazado' };
  }

  /**
   * Formatea un presupuesto para la respuesta
   */
  private formatPresupuesto(presupuesto: any) {
    return {
      id: presupuesto.id,
      pacienteId: presupuesto.pacienteId,
      profesionalId: presupuesto.profesionalId,
      subtotal: Number(presupuesto.subtotal),
      descuentos: Number(presupuesto.descuentos),
      total: Number(presupuesto.total),
      moneda: presupuesto.moneda,
      fechaValidez: presupuesto.fechaValidez,
      estado: presupuesto.estado,
      fechaAceptado: presupuesto.fechaAceptado,
      createdAt: presupuesto.createdAt,
      items: presupuesto.items?.map((item: any) => ({
        id: item.id,
        descripcion: item.descripcion,
        precioTotal: Number(item.precioTotal),
      })),
      paciente: presupuesto.paciente,
      profesional: presupuesto.profesional
        ? {
            id: presupuesto.profesional.id,
            nombre: `${presupuesto.profesional.usuario.nombre} ${presupuesto.profesional.usuario.apellido}`,
          }
        : undefined,
    };
  }
}

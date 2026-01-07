import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CuentasCorrientesService } from '../cuentas-corrientes/cuentas-corrientes.service';
import { CreatePresupuestoDto } from './dto/create-presupuesto.dto';
import { EstadoPresupuesto, TipoMovimiento } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PresupuestosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cuentasCorrientesService: CuentasCorrientesService,
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
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      total: item.cantidad * item.precioUnitario,
      orden: index,
    }));

    const subtotal = itemsConTotal.reduce((acc, item) => acc + item.total, 0);
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

    // Actualizar estado del presupuesto
    const updated = await this.prisma.presupuesto.update({
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
    });

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
      estado: presupuesto.estado,
      fechaAceptado: presupuesto.fechaAceptado,
      createdAt: presupuesto.createdAt,
      items: presupuesto.items?.map((item: any) => ({
        id: item.id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precioUnitario: Number(item.precioUnitario),
        total: Number(item.total),
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

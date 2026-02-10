import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegistrarPagoProveedorDto, PagarCuotaDto } from './dto';
import {
  TipoMovimiento,
  CondicionPagoProveedor,
  EstadoCuota,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CuentasCorrientesProveedoresService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene o crea la cuenta corriente de un proveedor
   */
  async getOrCreateCuentaCorriente(proveedorId: string, profesionalId: string) {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: proveedorId },
    });

    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    let cuentaCorriente = await this.prisma.cuentaCorrienteProveedor.findUnique(
      {
        where: { proveedorId },
      },
    );

    if (!cuentaCorriente) {
      cuentaCorriente = await this.prisma.cuentaCorrienteProveedor.create({
        data: {
          proveedorId,
          profesionalId,
          saldoActual: 0,
          totalPagadoHistorico: 0,
        },
      });
    }

    return cuentaCorriente;
  }

  /**
   * Lista todas las cuentas corrientes de proveedores
   */
  async findAll(filters?: { profesionalId?: string; soloConDeuda?: boolean }) {
    const whereClause: any = {};

    if (filters?.profesionalId) {
      whereClause.profesionalId = filters.profesionalId;
    }

    if (filters?.soloConDeuda) {
      whereClause.saldoActual = { gt: 0 };
    }

    const cuentas = await this.prisma.cuentaCorrienteProveedor.findMany({
      where: whereClause,
      include: {
        proveedor: {
          select: {
            id: true,
            nombre: true,
            cuit: true,
            telefono: true,
            email: true,
          },
        },
        movimientos: {
          take: 1,
          orderBy: { fecha: 'desc' },
          select: { fecha: true },
        },
      },
      orderBy: { saldoActual: 'desc' },
    });

    return cuentas.map((c) => ({
      id: c.id,
      proveedorId: c.proveedorId,
      profesionalId: c.profesionalId,
      saldoActual: Number(c.saldoActual),
      totalPagadoHistorico: Number(c.totalPagadoHistorico),
      proveedor: c.proveedor,
      ultimoMovimiento: c.movimientos[0]?.fecha || null,
      createdAt: c.createdAt,
    }));
  }

  /**
   * Obtiene la cuenta corriente de un proveedor
   */
  async findByProveedor(proveedorId: string, profesionalId: string) {
    const cuenta = await this.getOrCreateCuentaCorriente(
      proveedorId,
      profesionalId,
    );

    return {
      id: cuenta.id,
      proveedorId: cuenta.proveedorId,
      profesionalId: cuenta.profesionalId,
      saldoActual: Number(cuenta.saldoActual),
      totalPagadoHistorico: Number(cuenta.totalPagadoHistorico),
      createdAt: cuenta.createdAt,
      updatedAt: cuenta.updatedAt,
    };
  }

  /**
   * Lista los movimientos de una cuenta corriente de proveedor
   */
  async findMovimientos(proveedorId: string, profesionalId: string) {
    const cuenta = await this.getOrCreateCuentaCorriente(
      proveedorId,
      profesionalId,
    );

    const movimientos = await this.prisma.movimientoCCProveedor.findMany({
      where: { cuentaCorrienteProveedorId: cuenta.id },
      orderBy: { fecha: 'desc' },
      include: {
        ordenCompra: {
          select: {
            id: true,
            fechaCreacion: true,
            total: true,
          },
        },
        cuota: {
          select: {
            id: true,
            numeroCuota: true,
            monto: true,
            fechaVencimiento: true,
          },
        },
      },
    });

    return movimientos.map((m) => ({
      id: m.id,
      monto: Number(m.monto),
      tipo: m.tipo,
      medioPago: m.medioPago,
      descripcion: m.descripcion,
      referencia: m.referencia,
      fecha: m.fecha,
      anulado: m.anulado,
      fechaAnulacion: m.fechaAnulacion,
      ordenCompra: m.ordenCompra
        ? {
            id: m.ordenCompra.id,
            fechaCreacion: m.ordenCompra.fechaCreacion,
            total: m.ordenCompra.total ? Number(m.ordenCompra.total) : null,
          }
        : null,
      cuota: m.cuota
        ? {
            id: m.cuota.id,
            numeroCuota: m.cuota.numeroCuota,
            monto: Number(m.cuota.monto),
            fechaVencimiento: m.cuota.fechaVencimiento,
          }
        : null,
    }));
  }

  /**
   * Lista las cuotas de un proveedor
   */
  async findCuotasByProveedor(
    proveedorId: string,
    profesionalId: string,
    estado?: EstadoCuota,
  ) {
    const cuotas = await this.prisma.cuotaOrdenCompra.findMany({
      where: {
        ordenCompra: {
          proveedorId,
          profesionalId,
        },
        ...(estado && { estado }),
      },
      orderBy: { fechaVencimiento: 'asc' },
      include: {
        ordenCompra: {
          select: {
            id: true,
            fechaCreacion: true,
            total: true,
            proveedor: { select: { nombre: true } },
          },
        },
      },
    });

    return cuotas.map((c) => ({
      id: c.id,
      ordenCompraId: c.ordenCompraId,
      numeroCuota: c.numeroCuota,
      monto: Number(c.monto),
      fechaVencimiento: c.fechaVencimiento,
      estado: c.estado,
      fechaPago: c.fechaPago,
      ordenCompra: {
        id: c.ordenCompra.id,
        fechaCreacion: c.ordenCompra.fechaCreacion,
        total: c.ordenCompra.total ? Number(c.ordenCompra.total) : null,
        proveedorNombre: c.ordenCompra.proveedor.nombre,
      },
    }));
  }

  /**
   * Registra un cargo en la cuenta corriente del proveedor (al recibir orden)
   */
  async registrarCargo(
    proveedorId: string,
    profesionalId: string,
    monto: number,
    ordenCompraId: string,
    descripcion?: string,
  ) {
    const cuenta = await this.getOrCreateCuentaCorriente(
      proveedorId,
      profesionalId,
    );

    return this.prisma.$transaction(async (tx) => {
      const movimiento = await tx.movimientoCCProveedor.create({
        data: {
          cuentaCorrienteProveedorId: cuenta.id,
          monto,
          tipo: TipoMovimiento.CARGO,
          descripcion: descripcion || `Orden de compra recibida`,
          ordenCompraId,
        },
      });

      await tx.cuentaCorrienteProveedor.update({
        where: { id: cuenta.id },
        data: {
          saldoActual: { increment: new Decimal(monto) },
        },
      });

      return movimiento;
    });
  }

  /**
   * Genera las cuotas para una orden de compra
   */
  async generarCuotas(
    ordenCompraId: string,
    total: number,
    condicionPago: CondicionPagoProveedor,
    cantidadCuotas: number,
    fechaPrimerVencimiento?: Date,
  ) {
    const fechaBase = fechaPrimerVencimiento || new Date();
    const cuotasData: {
      ordenCompraId: string;
      numeroCuota: number;
      monto: number;
      fechaVencimiento: Date;
    }[] = [];

    let diasEntreCuotas: number;
    switch (condicionPago) {
      case CondicionPagoProveedor.CONTADO:
        diasEntreCuotas = 0;
        cantidadCuotas = 1;
        break;
      case CondicionPagoProveedor.DIAS_30:
        diasEntreCuotas = 30;
        break;
      case CondicionPagoProveedor.DIAS_60:
        diasEntreCuotas = 60;
        break;
      case CondicionPagoProveedor.DIAS_90:
        diasEntreCuotas = 90;
        break;
      case CondicionPagoProveedor.PERSONALIZADO:
      default:
        diasEntreCuotas = 30;
        break;
    }

    const montoPorCuota = Math.floor((total / cantidadCuotas) * 100) / 100;
    let montoAcumulado = 0;

    for (let i = 1; i <= cantidadCuotas; i++) {
      const fechaVencimiento = new Date(fechaBase);
      if (condicionPago === CondicionPagoProveedor.CONTADO) {
        // Vencimiento inmediato para contado
      } else {
        fechaVencimiento.setDate(
          fechaVencimiento.getDate() + diasEntreCuotas * (i - 1),
        );
      }

      // Última cuota ajusta la diferencia por redondeo
      const monto =
        i === cantidadCuotas ? total - montoAcumulado : montoPorCuota;
      montoAcumulado += montoPorCuota;

      cuotasData.push({
        ordenCompraId,
        numeroCuota: i,
        monto,
        fechaVencimiento,
      });
    }

    await this.prisma.cuotaOrdenCompra.createMany({
      data: cuotasData,
    });

    return cuotasData;
  }

  /**
   * Registra un pago general a proveedor
   */
  async registrarPago(
    proveedorId: string,
    profesionalId: string,
    dto: RegistrarPagoProveedorDto,
    usuarioId?: string,
  ) {
    const cuenta = await this.getOrCreateCuentaCorriente(
      proveedorId,
      profesionalId,
    );

    return this.prisma.$transaction(async (tx) => {
      const movimiento = await tx.movimientoCCProveedor.create({
        data: {
          cuentaCorrienteProveedorId: cuenta.id,
          monto: dto.monto,
          tipo: TipoMovimiento.PAGO,
          medioPago: dto.medioPago,
          descripcion: dto.descripcion || 'Pago a proveedor',
          referencia: dto.referencia,
          ordenCompraId: dto.ordenCompraId,
          usuarioId,
        },
      });

      await tx.cuentaCorrienteProveedor.update({
        where: { id: cuenta.id },
        data: {
          saldoActual: { decrement: new Decimal(dto.monto) },
          totalPagadoHistorico: { increment: new Decimal(dto.monto) },
        },
      });

      return {
        id: movimiento.id,
        monto: Number(movimiento.monto),
        tipo: movimiento.tipo,
        medioPago: movimiento.medioPago,
        descripcion: movimiento.descripcion,
        referencia: movimiento.referencia,
        fecha: movimiento.fecha,
      };
    });
  }

  /**
   * Paga una cuota específica
   */
  async pagarCuota(
    cuotaId: string,
    profesionalId: string,
    dto: PagarCuotaDto,
    usuarioId?: string,
  ) {
    const cuota = await this.prisma.cuotaOrdenCompra.findUnique({
      where: { id: cuotaId },
      include: {
        ordenCompra: {
          select: {
            id: true,
            proveedorId: true,
            profesionalId: true,
          },
        },
      },
    });

    if (!cuota) {
      throw new NotFoundException('Cuota no encontrada');
    }

    if (cuota.ordenCompra.profesionalId !== profesionalId) {
      throw new BadRequestException('No tiene acceso a esta cuota');
    }

    if (cuota.estado === EstadoCuota.PAGADA) {
      throw new BadRequestException('La cuota ya está pagada');
    }

    if (cuota.estado === EstadoCuota.ANULADA) {
      throw new BadRequestException('La cuota está anulada');
    }

    const cuenta = await this.getOrCreateCuentaCorriente(
      cuota.ordenCompra.proveedorId,
      profesionalId,
    );

    return this.prisma.$transaction(async (tx) => {
      // Crear movimiento de pago
      const movimiento = await tx.movimientoCCProveedor.create({
        data: {
          cuentaCorrienteProveedorId: cuenta.id,
          monto: cuota.monto,
          tipo: TipoMovimiento.PAGO,
          medioPago: dto.medioPago,
          descripcion: `Pago cuota ${cuota.numeroCuota}`,
          referencia: dto.referencia,
          ordenCompraId: cuota.ordenCompraId,
          cuotaId: cuota.id,
          usuarioId,
        },
      });

      // Actualizar estado de la cuota
      await tx.cuotaOrdenCompra.update({
        where: { id: cuotaId },
        data: {
          estado: EstadoCuota.PAGADA,
          fechaPago: new Date(),
        },
      });

      // Actualizar saldos
      const montoDecimal = new Decimal(cuota.monto.toString());
      await tx.cuentaCorrienteProveedor.update({
        where: { id: cuenta.id },
        data: {
          saldoActual: { decrement: montoDecimal },
          totalPagadoHistorico: { increment: montoDecimal },
        },
      });

      return {
        id: movimiento.id,
        monto: Number(movimiento.monto),
        tipo: movimiento.tipo,
        medioPago: movimiento.medioPago,
        descripcion: movimiento.descripcion,
        fecha: movimiento.fecha,
        cuota: {
          id: cuota.id,
          numeroCuota: cuota.numeroCuota,
          estado: EstadoCuota.PAGADA,
        },
      };
    });
  }

  /**
   * Resumen de deudas con proveedores
   */
  async getResumenDeudas(profesionalId: string) {
    const cuentas = await this.prisma.cuentaCorrienteProveedor.findMany({
      where: {
        profesionalId,
        saldoActual: { gt: 0 },
      },
      include: {
        proveedor: { select: { id: true, nombre: true } },
      },
    });

    const cuotasPendientes = await this.prisma.cuotaOrdenCompra.findMany({
      where: {
        ordenCompra: { profesionalId },
        estado: { in: [EstadoCuota.PENDIENTE, EstadoCuota.VENCIDA] },
      },
    });

    const ahora = new Date();
    let totalDeuda = 0;
    let totalVencido = 0;
    let totalPorVencer = 0;

    for (const cuota of cuotasPendientes) {
      const monto = Number(cuota.monto);
      totalDeuda += monto;

      if (cuota.fechaVencimiento < ahora) {
        totalVencido += monto;
      } else {
        totalPorVencer += monto;
      }
    }

    return {
      totalDeuda,
      totalVencido,
      totalPorVencer,
      cantidadProveedoresConDeuda: cuentas.length,
      proveedores: cuentas.map((c) => ({
        proveedorId: c.proveedorId,
        nombre: c.proveedor.nombre,
        saldoActual: Number(c.saldoActual),
      })),
    };
  }

  /**
   * Obtiene cuotas vencidas
   */
  async getCuotasVencidas(profesionalId: string) {
    const ahora = new Date();

    // Actualizar estado de cuotas vencidas
    await this.prisma.cuotaOrdenCompra.updateMany({
      where: {
        ordenCompra: { profesionalId },
        estado: EstadoCuota.PENDIENTE,
        fechaVencimiento: { lt: ahora },
      },
      data: { estado: EstadoCuota.VENCIDA },
    });

    const cuotas = await this.prisma.cuotaOrdenCompra.findMany({
      where: {
        ordenCompra: { profesionalId },
        estado: EstadoCuota.VENCIDA,
      },
      orderBy: { fechaVencimiento: 'asc' },
      include: {
        ordenCompra: {
          select: {
            id: true,
            proveedor: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    return cuotas.map((c) => ({
      id: c.id,
      ordenCompraId: c.ordenCompraId,
      numeroCuota: c.numeroCuota,
      monto: Number(c.monto),
      fechaVencimiento: c.fechaVencimiento,
      diasVencida: Math.floor(
        (ahora.getTime() - c.fechaVencimiento.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
      proveedor: c.ordenCompra.proveedor,
    }));
  }

  /**
   * Obtiene cuotas próximas a vencer
   */
  async getCuotasProximas(profesionalId: string, dias: number = 30) {
    const ahora = new Date();
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + dias);

    const cuotas = await this.prisma.cuotaOrdenCompra.findMany({
      where: {
        ordenCompra: { profesionalId },
        estado: EstadoCuota.PENDIENTE,
        fechaVencimiento: {
          gte: ahora,
          lte: fechaLimite,
        },
      },
      orderBy: { fechaVencimiento: 'asc' },
      include: {
        ordenCompra: {
          select: {
            id: true,
            proveedor: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    return cuotas.map((c) => ({
      id: c.id,
      ordenCompraId: c.ordenCompraId,
      numeroCuota: c.numeroCuota,
      monto: Number(c.monto),
      fechaVencimiento: c.fechaVencimiento,
      diasParaVencer: Math.floor(
        (c.fechaVencimiento.getTime() - ahora.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
      proveedor: c.ordenCompra.proveedor,
    }));
  }
}

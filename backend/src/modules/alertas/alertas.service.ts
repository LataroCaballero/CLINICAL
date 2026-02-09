import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AlertaModulo,
  AlertasResumenDto,
  AlertaItem,
  Severity,
} from './dto/alertas-resumen.dto';

@Injectable()
export class AlertasService {
  constructor(private prisma: PrismaService) {}

  async getResumen(profesionalId?: string): Promise<AlertasResumenDto> {
    // Secuencial para evitar MaxClientsInSessionMode con pgBouncer
    const alertasTurnos = await this.getAlertasTurnos(profesionalId);
    const alertasFinanzas = await this.getAlertasFinanzas(profesionalId);
    const alertasStock = await this.getAlertasStock(profesionalId);

    const alertas: AlertaModulo[] = [
      alertasTurnos,
      alertasFinanzas,
      alertasStock,
    ].filter((a) => a.count > 0);

    const totalCount = alertas.reduce((sum, a) => sum + a.count, 0);

    return {
      timestamp: new Date().toISOString(),
      alertas,
      totalCount,
    };
  }

  private async getAlertasTurnos(
    profesionalId?: string,
  ): Promise<AlertaModulo> {
    const now = new Date();
    const hace24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const hace8h = new Date(now.getTime() - 8 * 60 * 60 * 1000);

    const whereBase = profesionalId ? { profesionalId } : {};

    // 1. Sin confirmar: estado=PENDIENTE, creado hace >24h, inicio futuro
    const sinConfirmar = await this.prisma.turno.count({
      where: {
        ...whereBase,
        estado: 'PENDIENTE',
        createdAt: { lt: hace24h },
        inicio: { gt: now },
      },
    });

    // 2. No-show: inicio pasado, inicioReal=null, estado PENDIENTE/CONFIRMADO
    const noShow = await this.prisma.turno.count({
      where: {
        ...whereBase,
        inicio: { lt: now },
        inicioReal: null,
        estado: { in: ['PENDIENTE', 'CONFIRMADO'] },
      },
    });

    // 3. Sesión abierta: inicioReal!=null, finReal=null, >8h abierta
    const sesionAbierta = await this.prisma.turno.count({
      where: {
        ...whereBase,
        inicioReal: { lt: hace8h, not: null },
        finReal: null,
      },
    });

    // 4. Sin HC: estado=FINALIZADO, entradaHCId=null
    const sinHC = await this.prisma.turno.count({
      where: {
        ...whereBase,
        estado: 'FINALIZADO',
        entradaHCId: null,
      },
    });

    const items: AlertaItem[] = [];
    if (sinConfirmar > 0)
      items.push({ tipo: 'Sin confirmar', count: sinConfirmar });
    if (noShow > 0) items.push({ tipo: 'Ausente', count: noShow });
    if (sesionAbierta > 0)
      items.push({ tipo: 'Sesión abierta', count: sesionAbierta });
    if (sinHC > 0) items.push({ tipo: 'Sin HC', count: sinHC });

    const totalCount = sinConfirmar + noShow + sesionAbierta + sinHC;

    // Severidad máxima: CRITICAL si hay no-show o sesión abierta
    let severity: Severity = 'INFO';
    if (totalCount > 0) severity = 'WARNING';
    if (noShow > 0 || sesionAbierta > 0) severity = 'CRITICAL';

    return {
      modulo: 'turnos',
      count: totalCount,
      severity,
      mensaje: this.buildMensajeTurnos(items),
      detalle: items.length > 0 ? { items } : undefined,
    };
  }

  private async getAlertasFinanzas(
    profesionalId?: string,
  ): Promise<AlertaModulo> {
    const now = new Date();
    const hace60dias = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const hace14dias = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const hace30dias = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Deuda envejecida: Cargos >60 días sin pagar
    // Buscar cuentas con saldo > 0 que tengan cargos antiguos
    const cuentasConDeuda = await this.prisma.cuentaCorriente.count({
      where: {
        saldoActual: { gt: 0 },
        ...(profesionalId ? { paciente: { profesionalId } } : {}),
        movimientos: {
          some: {
            tipo: 'CARGO',
            anulado: false,
            fecha: { lt: hace60dias },
          },
        },
      },
    });

    // 2. Presupuesto pendiente: estado=ENVIADO, >14 días sin respuesta
    const wherePresupuesto = profesionalId ? { profesionalId } : {};
    const presupuestosPendientes = await this.prisma.presupuesto.count({
      where: {
        ...wherePresupuesto,
        estado: 'ENVIADO',
        fechaEnviado: { lt: hace14dias },
      },
    });

    // 3. Práctica sin liquidar: estadoLiquidacion=PENDIENTE, >30 días
    const wherePractica = profesionalId ? { profesionalId } : {};
    const practicasSinLiquidar = await this.prisma.practicaRealizada.count({
      where: {
        ...wherePractica,
        estadoLiquidacion: 'PENDIENTE',
        fecha: { lt: hace30dias },
      },
    });

    const items: AlertaItem[] = [];
    if (cuentasConDeuda > 0)
      items.push({ tipo: 'Deuda envejecida', count: cuentasConDeuda });
    if (presupuestosPendientes > 0)
      items.push({
        tipo: 'Presupuesto pendiente',
        count: presupuestosPendientes,
      });
    if (practicasSinLiquidar > 0)
      items.push({
        tipo: 'Práctica sin liquidar',
        count: practicasSinLiquidar,
      });

    const totalCount =
      cuentasConDeuda + presupuestosPendientes + practicasSinLiquidar;

    // Severidad máxima: CRITICAL si hay deuda envejecida
    let severity: Severity = 'INFO';
    if (totalCount > 0) severity = 'WARNING';
    if (cuentasConDeuda > 0) severity = 'CRITICAL';

    return {
      modulo: 'finanzas',
      count: totalCount,
      severity,
      mensaje: this.buildMensajeFinanzas(items),
      detalle: items.length > 0 ? { items } : undefined,
    };
  }

  private async getAlertasStock(profesionalId?: string): Promise<AlertaModulo> {
    const now = new Date();
    const en30dias = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1. Stock bajo: stockActual < stockMinimo (usar raw query para comparar campos)
    let stockBajoCount: number;
    if (profesionalId) {
      const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM "Inventario"
        WHERE "stockActual" < "stockMinimo"
        AND "profesionalId" = ${profesionalId}
      `;
      stockBajoCount = Number(result[0]?.count ?? 0);
    } else {
      const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM "Inventario"
        WHERE "stockActual" < "stockMinimo"
      `;
      stockBajoCount = Number(result[0]?.count ?? 0);
    }

    // 2. Próximo a vencer: fechaVencimiento <= hoy + 30 días, cantidadActual > 0
    const whereLote = profesionalId ? { profesionalId } : {};
    const proximoVencer = await this.prisma.lote.count({
      where: {
        ...whereLote,
        fechaVencimiento: { lte: en30dias, gte: now },
        cantidadActual: { gt: 0 },
      },
    });

    const items: AlertaItem[] = [];
    if (stockBajoCount > 0)
      items.push({ tipo: 'Stock bajo', count: stockBajoCount });
    if (proximoVencer > 0)
      items.push({ tipo: 'Próximo a vencer', count: proximoVencer });

    const totalCount = stockBajoCount + proximoVencer;

    const severity: Severity = totalCount > 0 ? 'WARNING' : 'INFO';

    return {
      modulo: 'stock',
      count: totalCount,
      severity,
      mensaje: this.buildMensajeStock(items),
      detalle: items.length > 0 ? { items } : undefined,
    };
  }

  private buildMensajeTurnos(items: AlertaItem[]): string {
    if (items.length === 0) return '';
    const parts = items.map((i) => `${i.count} ${i.tipo.toLowerCase()}`);
    return `Turnos: ${parts.join(', ')}`;
  }

  private buildMensajeFinanzas(items: AlertaItem[]): string {
    if (items.length === 0) return '';
    const parts = items.map((i) => `${i.count} ${i.tipo.toLowerCase()}`);
    return `Finanzas: ${parts.join(', ')}`;
  }

  private buildMensajeStock(items: AlertaItem[]): string {
    if (items.length === 0) return '';
    const parts = items.map((i) => `${i.count} ${i.tipo.toLowerCase()}`);
    return `Stock: ${parts.join(', ')}`;
  }
}

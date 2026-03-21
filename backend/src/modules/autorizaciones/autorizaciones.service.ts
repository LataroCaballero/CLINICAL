import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAutorizacionDto } from './dto/create-autorizacion.dto';
import { AutorizarAutorizacionDto } from './dto/autorizar-autorizacion.dto';

type CodigoPractica = {
  codigo: string;
  descripcion: string;
  monto?: number;
  coseguro?: number;
};

@Injectable()
export class AutorizacionesService {
  constructor(private prisma: PrismaService) {}

  async createAutorizacion(
    dto: CreateAutorizacionDto,
    profesionalIdFromJwt: string | null,
    registradoPorId: string | undefined,
  ) {
    const profesionalId = profesionalIdFromJwt ?? dto.profesionalId;
    if (!profesionalId) throw new BadRequestException('profesionalId requerido');

    const obraSocial = await this.prisma.obraSocial.findUnique({
      where: { id: dto.obraSocialId },
      select: { nombre: true },
    });
    if (!obraSocial) throw new NotFoundException('Obra social no encontrada');

    const codigosStr = dto.codigos.map((c) => `${c.codigo} - ${c.descripcion}`).join(', ');

    return this.prisma.$transaction(async (tx) => {
      const aut = await tx.autorizacionObraSocial.create({
        data: {
          pacienteId: dto.pacienteId,
          obraSocialId: dto.obraSocialId,
          profesionalId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          codigos: dto.codigos as any,
          estado: 'PENDIENTE',
        },
      });

      await tx.contactoLog.create({
        data: {
          pacienteId: dto.pacienteId,
          profesionalId,
          tipo: 'SISTEMA',
          nota: `Códigos pendientes de autorización con ${obraSocial.nombre}: ${codigosStr}`,
          registradoPorId: registradoPorId ?? null,
        },
      });

      return aut;
    });
  }

  async findAll(estado?: string, profesionalId?: string, pacienteId?: string) {
    return this.prisma.autorizacionObraSocial.findMany({
      where: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(estado ? { estado: estado as any } : {}),
        ...(profesionalId ? { profesionalId } : {}),
        ...(pacienteId ? { pacienteId } : {}),
      },
      include: {
        paciente: { select: { id: true, nombreCompleto: true, telefono: true } },
        obraSocial: { select: { id: true, nombre: true } },
        profesional: {
          select: { id: true, usuario: { select: { nombre: true, apellido: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async autorizarCodigos(
    id: string,
    dto: AutorizarAutorizacionDto,
    autorizadoPorId: string | undefined,
  ) {
    const aut = await this.prisma.autorizacionObraSocial.findUnique({
      where: { id },
      include: { obraSocial: { select: { nombre: true } } },
    });
    if (!aut) throw new NotFoundException('Autorización no encontrada');
    if (aut.estado !== 'PENDIENTE')
      throw new BadRequestException('La autorización no está en estado PENDIENTE');

    const codigos = aut.codigos as CodigoPractica[];
    const codigosStr = codigos.map((c) => `${c.codigo} - ${c.descripcion}`).join(', ');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.autorizacionObraSocial.update({
        where: { id },
        data: {
          estado: 'AUTORIZADO',
          fechaAutorizacion: new Date(),
          autorizadoPorId: autorizadoPorId ?? null,
          notaSecretaria: dto.notaSecretaria ?? null,
        },
      });

      await tx.contactoLog.create({
        data: {
          pacienteId: aut.pacienteId,
          profesionalId: aut.profesionalId,
          tipo: 'SISTEMA',
          nota: `Códigos autorizados por ${aut.obraSocial.nombre}: ${codigosStr}. Se puede enviar presupuesto.`,
          registradoPorId: autorizadoPorId ?? null,
        },
      });

      await tx.practicaRealizada.createMany({
        data: codigos.map((c) => ({
          pacienteId: aut.pacienteId,
          profesionalId: aut.profesionalId,
          obraSocialId: aut.obraSocialId,
          codigo: c.codigo,
          descripcion: c.descripcion,
          monto: c.monto ?? 0,
          coseguro: c.coseguro ?? 0,
          estadoLiquidacion: 'PENDIENTE',
        })),
      });

      return updated;
    });
  }

  async rechazarCodigos(id: string, nota: string | undefined, rechazadoPorId: string | undefined) {
    const aut = await this.prisma.autorizacionObraSocial.findUnique({
      where: { id },
      include: { obraSocial: { select: { nombre: true } } },
    });
    if (!aut) throw new NotFoundException('Autorización no encontrada');
    if (aut.estado !== 'PENDIENTE')
      throw new BadRequestException('La autorización no está en estado PENDIENTE');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.autorizacionObraSocial.update({
        where: { id },
        data: { estado: 'RECHAZADO' },
      });

      await tx.contactoLog.create({
        data: {
          pacienteId: aut.pacienteId,
          profesionalId: aut.profesionalId,
          tipo: 'SISTEMA',
          nota: `Autorización rechazada por ${aut.obraSocial.nombre}${nota ? `: ${nota}` : ''}.`,
          registradoPorId: rechazadoPorId ?? null,
        },
      });

      return updated;
    });
  }
}

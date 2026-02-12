import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigTipoTurnoItemDto } from './dto/config-tipo-turno.dto';

@Injectable()
export class TiposTurnoService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tipoTurno.findMany({
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        duracionDefault: true,
      },
    });
  }

  /** Get per-professional config for all tipos de turno */
  async getConfigByProfesional(profesionalId: string) {
    return this.prisma.tipoTurnoProfesional.findMany({
      where: { profesionalId },
      select: {
        id: true,
        tipoTurnoId: true,
        duracionMinutos: true,
        colorHex: true,
      },
    });
  }

  /** Bulk upsert per-professional config */
  async saveConfigByProfesional(
    profesionalId: string,
    items: ConfigTipoTurnoItemDto[],
  ) {
    const ops = items.map((item) =>
      this.prisma.tipoTurnoProfesional.upsert({
        where: {
          profesionalId_tipoTurnoId: {
            profesionalId,
            tipoTurnoId: item.tipoTurnoId,
          },
        },
        update: {
          duracionMinutos: item.duracionMinutos ?? null,
          colorHex: item.colorHex ?? null,
        },
        create: {
          profesionalId,
          tipoTurnoId: item.tipoTurnoId,
          duracionMinutos: item.duracionMinutos ?? null,
          colorHex: item.colorHex ?? null,
        },
        select: {
          id: true,
          tipoTurnoId: true,
          duracionMinutos: true,
          colorHex: true,
        },
      }),
    );

    return this.prisma.$transaction(ops);
  }
}

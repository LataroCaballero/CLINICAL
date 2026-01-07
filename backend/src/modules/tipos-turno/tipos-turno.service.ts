import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TiposTurnoService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tipoTurno.findMany({
      orderBy: {
        nombre: 'asc',
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        duracionDefault: true,
      },
    });
  }
}

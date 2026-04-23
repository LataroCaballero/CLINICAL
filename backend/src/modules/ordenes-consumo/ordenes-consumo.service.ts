import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrdenesConsumoService {
  constructor(private prisma: PrismaService) {}

  findPendientesByProfesional(profesionalId: string) {
    return this.prisma.ordenConsumo.findMany({
      where: { profesionalId, estado: 'PENDIENTE' },
      include: { insumos: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

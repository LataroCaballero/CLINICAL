import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePlanDto } from './dto/plan.dto';

@Injectable()
export class ObrasSocialesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.obraSocial.findMany({
      select: {
        id: true,
        nombre: true,
        planes: true,
      },
    });
  }

  async createPlan(obraSocialId: string, dto: CreatePlanDto) {
    return this.prisma.planObraSocial.create({
      data: {
        nombre: dto.nombre,
        cobertura: dto.cobertura ?? '',
        obraSocialId,
      },
    });
  }

  async deletePlan(planId: string) {
    return this.prisma.planObraSocial.delete({
      where: { id: planId },
    });
  }
}

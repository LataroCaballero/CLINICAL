import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateProfesionalDto } from './dto/update-profesional.dto';
import { UpdateAgendaDto, AgendaConfig } from './dto/update-agenda.dto';

@Injectable()
export class ProfesionalesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.profesional.findMany({
      select: {
        id: true,
        especialidad: true,
        usuario: {
          select: {
            nombre: true,
            apellido: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const profesional = await this.prisma.profesional.findUnique({
      where: { id },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            telefono: true,
            fotoUrl: true,
          },
        },
      },
    });

    if (!profesional) {
      throw new NotFoundException('Profesional no encontrado');
    }

    return profesional;
  }

  async findByUserId(usuarioId: string) {
    const profesional = await this.prisma.profesional.findUnique({
      where: { usuarioId },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            telefono: true,
            fotoUrl: true,
          },
        },
      },
    });

    if (!profesional) {
      throw new NotFoundException('Profesional no encontrado');
    }

    return profesional;
  }

  async update(id: string, dto: UpdateProfesionalDto) {
    const profesional = await this.prisma.profesional.findUnique({
      where: { id },
    });

    if (!profesional) {
      throw new NotFoundException('Profesional no encontrado');
    }

    return this.prisma.profesional.update({
      where: { id },
      data: dto,
      include: {
        usuario: {
          select: {
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
    });
  }

  async getAgenda(id: string): Promise<AgendaConfig | null> {
    const profesional = await this.prisma.profesional.findUnique({
      where: { id },
      select: { agenda: true },
    });

    if (!profesional) {
      throw new NotFoundException('Profesional no encontrado');
    }

    return profesional.agenda as AgendaConfig | null;
  }

  async updateAgenda(id: string, dto: UpdateAgendaDto) {
    const profesional = await this.prisma.profesional.findUnique({
      where: { id },
    });

    if (!profesional) {
      throw new NotFoundException('Profesional no encontrado');
    }

    // Merge con agenda existente o crear nueva
    const currentAgenda = (profesional.agenda as AgendaConfig) || {
      horariosTrabajo: {},
      diasBloqueados: [],
      diasCirugia: [],
    };

    const newAgenda: AgendaConfig = {
      horariosTrabajo: dto.horariosTrabajo ?? currentAgenda.horariosTrabajo,
      diasBloqueados: dto.diasBloqueados ?? currentAgenda.diasBloqueados,
      diasCirugia: dto.diasCirugia ?? currentAgenda.diasCirugia,
    };

    return this.prisma.profesional.update({
      where: { id },
      data: { agenda: newAgenda },
      select: { id: true, agenda: true },
    });
  }
}

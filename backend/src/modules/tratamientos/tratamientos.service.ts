import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTratamientoDto } from './dto/create-tratamiento.dto';
import { UpdateTratamientoDto } from './dto/update-tratamiento.dto';

@Injectable()
export class TratamientosService {
  constructor(private prisma: PrismaService) {}

  // =====================
  // CATALOGO (legacy, global)
  // =====================

  async findAllCatalogo(q?: string) {
    return this.prisma.tratamientoCatalogo.findMany({
      where: q ? { nombre: { contains: q, mode: 'insensitive' } } : undefined,
      orderBy: { nombre: 'asc' },
    });
  }

  async createCatalogo(nombre: string) {
    const nombreNormalizado = nombre.trim();

    const existente = await this.prisma.tratamientoCatalogo.findUnique({
      where: { nombre: nombreNormalizado },
    });

    if (existente) {
      return existente;
    }

    try {
      return await this.prisma.tratamientoCatalogo.create({
        data: { nombre: nombreNormalizado },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        const encontrado = await this.prisma.tratamientoCatalogo.findUnique({
          where: { nombre: nombreNormalizado },
        });
        if (encontrado) {
          return encontrado;
        }
      }
      throw error;
    }
  }

  async removeCatalogo(id: string) {
    return this.prisma.tratamientoCatalogo.delete({ where: { id } });
  }

  // =====================
  // TRATAMIENTOS por Profesional
  // =====================

  async findAllByProfesional(profesionalId: string, includeInactive = false) {
    return this.prisma.tratamiento.findMany({
      where: {
        profesionalId,
        ...(includeInactive ? {} : { activo: true }),
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findById(id: string, profesionalId: string) {
    const tratamiento = await this.prisma.tratamiento.findUnique({
      where: { id },
    });

    if (!tratamiento) {
      throw new NotFoundException('Tratamiento no encontrado');
    }

    if (tratamiento.profesionalId !== profesionalId) {
      throw new ForbiddenException('No tenés acceso a este tratamiento');
    }

    return tratamiento;
  }

  async findByIds(ids: string[], profesionalId: string) {
    return this.prisma.tratamiento.findMany({
      where: {
        id: { in: ids },
        profesionalId,
        activo: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async create(profesionalId: string, dto: CreateTratamientoDto) {
    // Check if a tratamiento with the same name already exists for this professional
    const existing = await this.prisma.tratamiento.findFirst({
      where: {
        nombre: dto.nombre.trim(),
        profesionalId,
      },
    });

    if (existing) {
      throw new ConflictException('Ya existe un tratamiento con este nombre');
    }

    return this.prisma.tratamiento.create({
      data: {
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion,
        precio: dto.precio ?? 0,
        indicaciones: dto.indicaciones,
        procedimiento: dto.procedimiento,
        duracionMinutos: dto.duracionMinutos,
        profesionalId,
      },
    });
  }

  async update(id: string, profesionalId: string, dto: UpdateTratamientoDto) {
    const tratamiento = await this.findById(id, profesionalId);

    // Check for name conflict if name is being updated
    if (dto.nombre && dto.nombre.trim() !== tratamiento.nombre) {
      const existing = await this.prisma.tratamiento.findFirst({
        where: {
          nombre: dto.nombre.trim(),
          profesionalId,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('Ya existe un tratamiento con este nombre');
      }
    }

    return this.prisma.tratamiento.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre.trim() }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.precio !== undefined && { precio: dto.precio }),
        ...(dto.indicaciones !== undefined && {
          indicaciones: dto.indicaciones,
        }),
        ...(dto.procedimiento !== undefined && {
          procedimiento: dto.procedimiento,
        }),
        ...(dto.duracionMinutos !== undefined && {
          duracionMinutos: dto.duracionMinutos,
        }),
      },
    });
  }

  async softDelete(id: string, profesionalId: string) {
    await this.findById(id, profesionalId);

    return this.prisma.tratamiento.update({
      where: { id },
      data: { activo: false },
    });
  }

  async restore(id: string, profesionalId: string) {
    const tratamiento = await this.prisma.tratamiento.findUnique({
      where: { id },
    });

    if (!tratamiento) {
      throw new NotFoundException('Tratamiento no encontrado');
    }

    if (tratamiento.profesionalId !== profesionalId) {
      throw new ForbiddenException('No tenés acceso a este tratamiento');
    }

    return this.prisma.tratamiento.update({
      where: { id },
      data: { activo: true },
    });
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCirugiaCatalogoDto } from './dto/create-cirugia-catalogo.dto';
import { UpdateCirugiaCatalogoDto } from './dto/update-cirugia-catalogo.dto';
import { InsumoItemCirugiaDto } from './dto/set-insumos-cirugia.dto';

@Injectable()
export class CirugiasCatalogoService {
  constructor(private prisma: PrismaService) {}

  async findAllByProfesional(profesionalId: string, includeInactive = false) {
    return this.prisma.cirugiaCatalogo.findMany({
      where: {
        profesionalId,
        ...(includeInactive ? {} : { activo: true }),
      },
      include: {
        insumos: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                costoBase: true,
                unidadMedida: true,
              },
            },
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findById(id: string, profesionalId: string) {
    const cirugia = await this.prisma.cirugiaCatalogo.findFirst({
      where: { id, profesionalId },
    });

    if (!cirugia) {
      throw new NotFoundException('Cirugía no encontrada');
    }

    return cirugia;
  }

  async create(profesionalId: string, dto: CreateCirugiaCatalogoDto) {
    try {
      return await this.prisma.cirugiaCatalogo.create({
        data: {
          ...dto,
          profesionalId,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Ya existe una cirugía con ese nombre');
      }
      throw error;
    }
  }

  async update(id: string, profesionalId: string, dto: UpdateCirugiaCatalogoDto) {
    await this.findById(id, profesionalId);

    return this.prisma.cirugiaCatalogo.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.precioARS !== undefined && { precioARS: dto.precioARS }),
        ...(dto.precioUSD !== undefined && { precioUSD: dto.precioUSD }),
        ...(dto.duracionMinutos !== undefined && { duracionMinutos: dto.duracionMinutos }),
      },
    });
  }

  async softDelete(id: string, profesionalId: string) {
    await this.findById(id, profesionalId);

    return this.prisma.cirugiaCatalogo.update({
      where: { id },
      data: { activo: false },
    });
  }

  async restore(id: string, profesionalId: string) {
    const cirugia = await this.prisma.cirugiaCatalogo.findFirst({
      where: { id, profesionalId },
    });

    if (!cirugia) {
      throw new NotFoundException('Cirugía no encontrada');
    }

    return this.prisma.cirugiaCatalogo.update({
      where: { id },
      data: { activo: true },
    });
  }

  async setInsumos(id: string, profesionalId: string, insumos: InsumoItemCirugiaDto[]) {
    await this.findById(id, profesionalId);

    await this.prisma.$transaction([
      this.prisma.cirugiaInsumo.deleteMany({ where: { cirugiaId: id } }),
      this.prisma.cirugiaInsumo.createMany({
        data: insumos.map((item) => ({
          cirugiaId: id,
          productoId: item.productoId,
          cantidad: item.cantidad,
        })),
      }),
    ]);

    return this.prisma.cirugiaCatalogo.findFirst({
      where: { id },
      include: {
        insumos: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                costoBase: true,
                unidadMedida: true,
              },
            },
          },
        },
      },
    });
  }

  async recalcularPrecioBase(id: string, profesionalId: string) {
    await this.findById(id, profesionalId);

    const cirugiaInsumos = await this.prisma.cirugiaInsumo.findMany({
      where: { cirugiaId: id },
      include: {
        producto: {
          select: {
            costoBase: true,
            inventarios: {
              where: { profesionalId },
              select: { precioActual: true },
            },
          },
        },
      },
    });

    const precioBase = cirugiaInsumos.reduce((sum, insumo) => {
      const precio =
        insumo.producto.inventarios[0]?.precioActual ??
        insumo.producto.costoBase ??
        0;
      return sum + Number(precio) * Number(insumo.cantidad);
    }, 0);

    return this.prisma.cirugiaCatalogo.update({
      where: { id },
      data: { precioBase },
      include: {
        insumos: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                costoBase: true,
                unidadMedida: true,
              },
            },
          },
        },
      },
    });
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProveedorDto, UpdateProveedorDto } from '../dto';

@Injectable()
export class ProveedoresService {
  constructor(private prisma: PrismaService) {}

  async findAll(q?: string) {
    return this.prisma.proveedor.findMany({
      where: q
        ? {
            OR: [
              { nombre: { contains: q, mode: 'insensitive' } },
              { cuit: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: { productos: true, OrdenCompra: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id },
      include: {
        productos: {
          include: {
            producto: { select: { id: true, nombre: true, sku: true } },
          },
        },
        OrdenCompra: {
          orderBy: { fechaCreacion: 'desc' },
          take: 10,
          select: {
            id: true,
            fechaCreacion: true,
            estado: true,
            items: {
              select: {
                cantidad: true,
                precioUnitario: true,
                producto: { select: { nombre: true } },
              },
            },
          },
        },
      },
    });

    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    return proveedor;
  }

  async create(dto: CreateProveedorDto) {
    // Verificar CUIT único si se proporciona
    if (dto.cuit) {
      const existing = await this.prisma.proveedor.findFirst({
        where: { cuit: dto.cuit },
      });
      if (existing) {
        throw new ConflictException('Ya existe un proveedor con este CUIT');
      }
    }

    return this.prisma.proveedor.create({
      data: dto,
    });
  }

  async update(id: string, dto: UpdateProveedorDto) {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id },
    });

    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    // Verificar CUIT único si se está actualizando
    if (dto.cuit && dto.cuit !== proveedor.cuit) {
      const existing = await this.prisma.proveedor.findFirst({
        where: { cuit: dto.cuit },
      });
      if (existing) {
        throw new ConflictException('Ya existe un proveedor con este CUIT');
      }
    }

    return this.prisma.proveedor.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id },
      include: {
        _count: { select: { OrdenCompra: true, productos: true } },
      },
    });

    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    if (proveedor._count.OrdenCompra > 0) {
      throw new ConflictException(
        'No se puede eliminar el proveedor porque tiene órdenes de compra asociadas',
      );
    }

    // Eliminar relaciones con productos
    await this.prisma.productoProveedor.deleteMany({
      where: { proveedorId: id },
    });

    return this.prisma.proveedor.delete({ where: { id } });
  }
}

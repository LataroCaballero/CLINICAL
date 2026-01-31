import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductoDto, UpdateProductoDto } from '../dto';
import { TipoProducto } from '@prisma/client';

@Injectable()
export class ProductosService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    q?: string;
    tipo?: TipoProducto;
    categoria?: string;
  }) {
    const where: any = {};

    if (filters?.q) {
      where.OR = [
        { nombre: { contains: filters.q, mode: 'insensitive' } },
        { sku: { contains: filters.q, mode: 'insensitive' } },
        { descripcion: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    if (filters?.tipo) {
      where.tipo = filters.tipo;
    }

    if (filters?.categoria) {
      where.categoria = { contains: filters.categoria, mode: 'insensitive' };
    }

    return this.prisma.producto.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: {
        proveedores: {
          include: {
            proveedor: {
              select: { id: true, nombre: true },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: {
        proveedores: {
          include: {
            proveedor: true,
          },
        },
        lotes: {
          where: { cantidadActual: { gt: 0 } },
          orderBy: { fechaVencimiento: 'asc' },
        },
      },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    return producto;
  }

  async create(dto: CreateProductoDto, profesionalId?: string) {
    // Verificar SKU único si se proporciona
    if (dto.sku) {
      const existingSku = await this.prisma.producto.findUnique({
        where: { sku: dto.sku },
      });
      if (existingSku) {
        throw new ConflictException('El SKU ya está en uso');
      }
    }

    // Crear producto y opcionalmente inventario inicial
    return this.prisma.$transaction(async (tx) => {
      const producto = await tx.producto.create({
        data: {
          nombre: dto.nombre,
          categoria: dto.categoria,
          descripcion: dto.descripcion,
          sku: dto.sku,
          imagenUrl: dto.imagenUrl,
          tipo: dto.tipo,
          unidadMedida: dto.unidadMedida,
          costoBase: dto.costoBase,
          precioSugerido: dto.precioSugerido,
          requiereLote: dto.requiereLote ?? false,
          descuentaStock: dto.descuentaStock ?? true,
        },
      });

      // Si se proporciona profesionalId, crear inventario inicial
      if (profesionalId) {
        const stockInicial = dto.stockInicial ?? 0;

        await tx.inventario.create({
          data: {
            productoId: producto.id,
            profesionalId,
            stockActual: stockInicial,
            stockMinimo: dto.stockMinimo ?? 0,
            precioActual: dto.precioActual ?? dto.precioSugerido,
          },
        });

        // Si el producto requiere lote y tiene stock inicial, crear un lote
        if ((dto.requiereLote ?? false) && stockInicial > 0) {
          await tx.lote.create({
            data: {
              productoId: producto.id,
              profesionalId,
              lote: dto.loteNumero ?? 'INICIAL',
              fechaVencimiento: dto.loteFechaVencimiento
                ? new Date(dto.loteFechaVencimiento)
                : null,
              cantidadInicial: stockInicial,
              cantidadActual: stockInicial,
            },
          });
        }
      }

      return producto;
    });
  }

  async update(id: string, dto: UpdateProductoDto) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Verificar SKU único si se está actualizando
    if (dto.sku && dto.sku !== producto.sku) {
      const existingSku = await this.prisma.producto.findUnique({
        where: { sku: dto.sku },
      });
      if (existingSku) {
        throw new ConflictException('El SKU ya está en uso');
      }
    }

    return this.prisma.producto.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        categoria: dto.categoria,
        descripcion: dto.descripcion,
        sku: dto.sku,
        imagenUrl: dto.imagenUrl,
        tipo: dto.tipo,
        unidadMedida: dto.unidadMedida,
        costoBase: dto.costoBase,
        precioSugerido: dto.precioSugerido,
        requiereLote: dto.requiereLote,
        descuentaStock: dto.descuentaStock,
      },
    });
  }

  async remove(id: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: {
        inventarios: true,
        VentaProductoItem: true,
        OrdenCompraItem: true,
      },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Verificar si tiene inventarios con stock o está en uso
    const hasStock = producto.inventarios.some((inv) => inv.stockActual > 0);
    const hasVentas = producto.VentaProductoItem.length > 0;
    const hasOrdenes = producto.OrdenCompraItem.length > 0;

    if (hasStock || hasVentas || hasOrdenes) {
      throw new ConflictException(
        'No se puede eliminar el producto porque tiene stock, ventas u órdenes de compra asociadas',
      );
    }

    // Eliminar inventarios vacíos primero
    await this.prisma.inventario.deleteMany({
      where: { productoId: id },
    });

    return this.prisma.producto.delete({ where: { id } });
  }

  async getCategorias() {
    const categorias = await this.prisma.producto.findMany({
      where: { categoria: { not: null } },
      select: { categoria: true },
      distinct: ['categoria'],
      orderBy: { categoria: 'asc' },
    });

    return categorias.map((c) => c.categoria).filter(Boolean);
  }

  async vincularProveedor(
    productoId: string,
    proveedorId: string,
    precioHistorico?: number,
  ) {
    // Verificar que existen
    const [producto, proveedor] = await Promise.all([
      this.prisma.producto.findUnique({ where: { id: productoId } }),
      this.prisma.proveedor.findUnique({ where: { id: proveedorId } }),
    ]);

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }
    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    // Crear o actualizar la relación
    return this.prisma.productoProveedor.upsert({
      where: {
        id: `${productoId}-${proveedorId}`, // Esto no funcionará directamente, necesitamos otro approach
      },
      create: {
        productoId,
        proveedorId,
        precioHistorico,
      },
      update: {
        precioHistorico,
      },
    });
  }
}

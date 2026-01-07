import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TratamientosService {
  constructor(private prisma: PrismaService) {}

  async findAll(q?: string) {
    return this.prisma.tratamientoCatalogo.findMany({
      where: q ? { nombre: { contains: q, mode: 'insensitive' } } : undefined,
      orderBy: { nombre: 'asc' },
    });
  }

  async create(nombre: string) {
    const nombreNormalizado = nombre.trim();

    // Primero intentar encontrar si ya existe
    const existente = await this.prisma.tratamientoCatalogo.findUnique({
      where: { nombre: nombreNormalizado },
    });

    if (existente) {
      return existente;
    }

    // Si no existe, crear uno nuevo
    try {
      return await this.prisma.tratamientoCatalogo.create({
        data: { nombre: nombreNormalizado },
      });
    } catch (error) {
      // Si falla por restricción única (concurrencia), buscar y retornar el existente
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

  async remove(id: string) {
    return this.prisma.tratamientoCatalogo.delete({ where: { id } });
  }
}

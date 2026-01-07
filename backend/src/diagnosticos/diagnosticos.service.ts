import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDiagnosticoDto } from './dto/create-diagnostico.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DiagnosticosService {
  constructor(private readonly prisma: PrismaService) {}

  // Obtener todos (para el Command)
  findAll() {
    return this.prisma.diagnosticoCatalogo.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  // Crear (idempotente: si existe, lo devuelve)
  async create(dto: CreateDiagnosticoDto) {
    const nombre = dto.nombre.trim();

    if (!nombre) {
      throw new Error('El nombre del diagnóstico no puede estar vacío');
    }

    return this.prisma.diagnosticoCatalogo.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  // Opcional: búsqueda por texto (para autocompletar con filtro backend)
  search(q: string) {
    const query = q.trim();
    if (!query) return this.findAll();

    return this.prisma.diagnosticoCatalogo.findMany({
      where: {
        nombre: {
          contains: query,
          mode: 'insensitive',
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  // Opcional: eliminar (por si después querés administrar catálogo)
  async remove(id: string) {
    return this.prisma.diagnosticoCatalogo.delete({
      where: { id },
    });
  }
}

// pacientes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { SearchPacienteDto } from './dto/search-paciente.dto';
import { PacienteSuggest } from 'src/common/types/paciente-suggest.type';
import { PacienteListaDto } from './dto/paciente-lista.dto';

@Injectable()
export class PacientesService {
  constructor(private prisma: PrismaService) {}

  // Crear
  create(dto: CreatePacienteDto) {
    return this.prisma.paciente.create({ data: dto });
  }

  async obtenerListaPacientes(): Promise<PacienteListaDto[]> {
    const ahora = new Date();

    const pacientes = await this.prisma.paciente.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        usuario: {
          select: {
            fotoUrl: true,
          },
        },
        cuentaCorriente: {
          select: {
            saldoActual: true,
          },
        },
        obraSocial: {
          select: {
            nombre: true,
          },
        },
        estudios: {
          select: {
            estado: true,
          },
        },
        turnos: {
          select: {
            inicio: true,
          },
          orderBy: {
            inicio: 'desc',
          },
        },
        presupuestos: {
          select: {
            estado: true,
          },
        },
      },
    });

    const lista: PacienteListaDto[] = pacientes.map((p) => {
      const turnosOrdenados = p.turnos.sort(
        (a, b) => a.inicio.getTime() - b.inicio.getTime(),
      );

      const pasado = turnosOrdenados.filter((t) => t.inicio < ahora);
      const futuro = turnosOrdenados.filter((t) => t.inicio >= ahora);

      const ultimoTurno = pasado.length
        ? pasado[pasado.length - 1].inicio
        : null;
      const proximoTurno = futuro.length ? futuro[0].inicio : null;

      const estudiosPendientes = p.estudios.filter(
        (e) => e.estado !== true,
      ).length;

      const presupuestosActivos = p.presupuestos.filter((pr) =>
        ['ENVIADO', 'ACEPTADO'].includes(pr.estado),
      ).length;

      return {
        id: p.id,
        fotoUrl: p.fotoUrl ?? p.usuario?.fotoUrl ?? null,
        nombreCompleto: p.nombreCompleto,
        dni: p.dni,
        telefono: p.telefono,
        email: p.email,
        obraSocialNombre: (p as any).obraSocial?.nombre ?? null,
        plan: p.plan,
        ultimoTurno,
        proximoTurno,
        deuda: Number(p.cuentaCorriente?.saldoActual ?? 0),
        estado: p.estado,
        consentimientoFirmado: p.consentimientoFirmado,
        estudiosPendientes,
        presupuestosActivos,
      };
    });

    return lista;
  }

  // Actualizar
  async update(id: string, dto: UpdatePacienteDto) {
    await this.ensureExists(id);
    return this.prisma.paciente.update({
      where: { id },
      data: dto,
    });
  }

  // Baja lógica o hard delete (según necesidad)
  async delete(id: string) {
    await this.ensureExists(id);
    return this.prisma.paciente.delete({ where: { id } });
  }

  // Buscar por ID
  async findOne(id: string) {
    const paciente = await this.prisma.paciente.findUnique({ where: { id } });
    if (!paciente) throw new NotFoundException('Paciente no encontrado');
    return paciente;
  }

  // RF-008 — Búsqueda avanzada + fonética simple
  async search(query: SearchPacienteDto) {
    const { q, dni, telefono, nombre } = query;

    // 🔎 Modo "buscador inteligente"
    if (q) {
      const results = await this.prisma.$queryRaw<
        Array<{
          id: string;
          nombreCompleto: string;
          dni: string;
          telefono: string;
          // ...otros campos que tenga tu modelo Paciente
          score: number;
        }>
      >`
        SELECT
          p.*,
          (
            -- Coincidencia exacta nombre
            CASE WHEN LOWER(p."nombreCompleto") = LOWER(${q}) THEN 1.0 ELSE 0 END +

            -- Contiene en nombre (ILIKE)
            CASE WHEN p."nombreCompleto" ILIKE '%' || ${q} || '%' THEN 0.6 ELSE 0 END +

            -- Similaridad fonética en nombre
            (similarity(p."nombreCompleto", ${q}) * 0.7) +

            -- Coincidencia exacta DNI
            CASE WHEN p."dni" = ${q} THEN 0.95 ELSE 0 END +

            -- DNI que empieza igual
            CASE WHEN p."dni" LIKE ${q} || '%' THEN 0.7 ELSE 0 END +

            -- Teléfono contiene
            CASE WHEN p."telefono" LIKE '%' || ${q} || '%' THEN 0.5 ELSE 0 END
          ) AS score
        FROM "Paciente" p
        WHERE
          -- Filtro mínimo de relevancia para no traer basura
          (
            similarity(p."nombreCompleto", ${q}) > 0.2
            OR p."nombreCompleto" ILIKE '%' || ${q} || '%'
            OR p."dni" LIKE ${q} || '%'
            OR p."telefono" LIKE '%' || ${q} || '%'
          )
        ORDER BY score DESC, p."nombreCompleto" ASC
        LIMIT 30;
      `;

      return results;
    }

    // 🎯 Sin q: modo filtros por campo (búsqueda normal)
    return this.prisma.paciente.findMany({
      where: {
        nombreCompleto: nombre
          ? { contains: nombre, mode: 'insensitive' }
          : undefined,
        dni: dni ? { contains: dni } : undefined,
        telefono: telefono ? { contains: telefono } : undefined,
      },
      orderBy: { nombreCompleto: 'asc' },
    });
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.paciente.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Paciente no encontrado');
  }

  async suggest(q: string): Promise<PacienteSuggest[]> {
    if (!q || q.trim().length < 2) return [];

    const query = q.trim();

    try {
      console.log('>>> SUGGEST START', query);
      const results = await this.prisma.$queryRaw<
        Array<{
          id: string;
          nombreCompleto: string;
          dni: string;
          telefono: string;
          fotoUrl: string | null;
          score: number;
        }>
      >`
      SELECT
        p.id,
        p."nombreCompleto",
        p.dni,
        p.telefono,
        p."fotoUrl",
        (
          CASE 
            WHEN LOWER(unaccent(p."nombreCompleto")) = LOWER(unaccent(${query})) 
              THEN 1.0 ELSE 0 
          END +
          CASE 
            WHEN unaccent(p."nombreCompleto") ILIKE '%' || unaccent(${query}) || '%' 
              THEN 0.6 ELSE 0 
          END +
          (similarity(unaccent(p."nombreCompleto"), unaccent(${query})) * 0.7) +
          CASE WHEN p.dni = ${query} THEN 0.95 ELSE 0 END +
          CASE WHEN p.dni LIKE ${query} || '%' THEN 0.7 ELSE 0 END +
          CASE WHEN p.telefono LIKE '%' || ${query} || '%' THEN 0.5 ELSE 0 END
        ) AS score
      FROM "Paciente" p
      WHERE
        similarity(unaccent(p."nombreCompleto"), unaccent(${query})) > 0.25
        OR unaccent(p."nombreCompleto") ILIKE '%' || unaccent(${query}) || '%'
        OR p.dni LIKE ${query} || '%'
        OR p.telefono LIKE '%' || ${query} || '%'
      ORDER BY score DESC
      LIMIT 10;
    `;

      console.log('>>> SUGGEST END');

      // Nunca devolver undefined → el frontend siempre recibe array
      return results ?? [];
    } catch (err) {
      console.error('❌ ERROR EN SUGGEST:', err);
      // Cualquier error interno → devolver []
      return [];
    }
  }
}

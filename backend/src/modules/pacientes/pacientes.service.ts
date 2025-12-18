// pacientes.service.ts
import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { SearchPacienteDto } from './dto/search-paciente.dto';
import { PacienteSuggest } from 'src/common/types/paciente-suggest.type';
import { PacienteListaDto } from './dto/paciente-lista.dto';
import { ESTADO_PRIORITY } from '../../common/constants/pacientes.constants';
import { EstadoPaciente } from '@prisma/client';
import { EstadoPresupuesto } from '@prisma/client';
import { BadRequestException } from "@nestjs/common";
import { UpdatePacienteSectionDto } from "./dto/update-paciente-section.dto";

@Injectable()
export class PacientesService {
  constructor(private prisma: PrismaService) { }

  // Crear  
  async create(dto: CreatePacienteDto) {
    console.log("DTO RECIBIDO:", dto);
    try {
      const data = {
        ...dto,
        fechaNacimiento: dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : null,
        fechaIndicaciones: dto.fechaIndicaciones ? new Date(dto.fechaIndicaciones) : null,
      };
      return this.prisma.paciente.create({
        data,
      });
    }
    catch (error: any) {
      console.log("ERROR CAPTURADO EN CATCH:", error);

      // Manejar directamente por STRUCTURE
      if (error.code === "P2002" && error.meta?.target?.includes("dni")) {
        throw new ConflictException("El DNI ingresado ya está registrado.");
      }

      throw new InternalServerErrorException("Error interno al crear paciente");
    }
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
        objecion: true
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
        diagnostico: p.diagnostico ?? null,
        tratamiento: p.tratamiento ?? null,
        lugarIntervencion: p.lugarIntervencion ?? null,
        ultimoTurno,
        proximoTurno,
        deuda: Number(p.cuentaCorriente?.saldoActual ?? 0),
        estado: p.estado,
        consentimientoFirmado: p.consentimientoFirmado,
        estudiosPendientes: p.estudios.filter(e => e.estado === false).length,
        presupuestosActivos: p.presupuestos.filter(
          pr =>
            pr.estado === EstadoPresupuesto.BORRADOR ||
            pr.estado === EstadoPresupuesto.ENVIADO
        ).length,
        objecion: p.objecion
          ? {
            id: p.objecion.id,
            nombre: p.objecion.nombre,
          }
          : null,
      } satisfies PacienteListaDto;
    });

    lista.sort((a, b) => {
      const pa =
        a.estado ? ESTADO_PRIORITY[a.estado as EstadoPaciente] ?? 99 : 99;
      const pb =
        b.estado ? ESTADO_PRIORITY[b.estado as EstadoPaciente] ?? 99 : 99;

      // Primero orden por prioridad de estado
      if (pa !== pb) return pa - pb;

      // Luego, por ejemplo, por nombre para que sea estable dentro del grupo
      return a.nombreCompleto.localeCompare(b.nombreCompleto);
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
    const paciente = await this.prisma.paciente.findUnique({
      where: { id },
      include: {
        obraSocial: true,
      },
    });
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

  async updatePacienteSection(id: string, dto: UpdatePacienteSectionDto) {
    switch (dto.section) {
      case "contacto":
        return this.updateContacto(id, dto.data);
      case "emergencia":
        return this.updateEmergencia(id, dto.data);
      case "cobertura":
        return this.updateCobertura(id, dto.data);
      case "clinica":
        return this.updateClinica(id, dto.data);
      case "estado":
        return this.updateEstado(id, dto.data);
      case "personales":
        return this.updatePersonales(id, dto.data);

      // después implementamos:
      // case "personales": return ...
      // case "emergencia": return ...
      // etc

      default:
        throw new BadRequestException("Sección no soportada");
    }
  }

  private async updateContacto(id: string, data: any) {
    // whitelist explícito
    const patch = {
      telefono: data.telefono,
      telefonoAlternativo: data.telefonoAlternativo ?? null,
      email: data.email ?? null,
    };

    // validación mínima backend
    if (typeof patch.telefono !== "string" || patch.telefono.trim().length < 6) {
      throw new BadRequestException("Teléfono inválido");
    }
    if (patch.email && typeof patch.email !== "string") {
      throw new BadRequestException("Email inválido");
    }

    return this.prisma.paciente.update({
      where: { id },
      data: patch,
    });
  }

  private async updateEmergencia(id: string, data: any) {
    const patch = {
      contactoEmergenciaNombre: data.contactoEmergenciaNombre,
      contactoEmergenciaRelacion: data.contactoEmergenciaRelacion,
      contactoEmergenciaTelefono: data.contactoEmergenciaTelefono,
    };

    if (
      !patch.contactoEmergenciaNombre ||
      !patch.contactoEmergenciaRelacion ||
      !patch.contactoEmergenciaTelefono
    ) {
      throw new BadRequestException("Datos de emergencia inválidos");
    }

    return this.prisma.paciente.update({
      where: { id },
      data: patch,
    });
  }

  private async updateCobertura(id: string, data: any) {
    const patch = {
      obraSocialId: data.obraSocialId ?? null,
      plan: data.plan ?? null,
    };

    if (patch.obraSocialId && typeof patch.obraSocialId !== "string") {
      throw new BadRequestException("Obra social inválida");
    }

    return this.prisma.paciente.update({
      where: { id },
      data: patch,
    });
  }

  private async updateClinica(id: string, data: any) {
    const patch = {
      alergias: data.alergias ?? [],
      condiciones: data.condiciones ?? [],
      diagnostico: data.diagnostico ?? null,
      tratamiento: data.tratamiento ?? null,
      deriva: data.deriva ?? null,
      lugarIntervencion: data.lugarIntervencion ?? null,
      objetivos: data.objetivos ?? null,
    };

    return this.prisma.paciente.update({
      where: { id },
      data: patch,
    });
  }

  private async updateEstado(id: string, data: any) {
    if (data.indicacionesEnviadas && !data.fechaIndicaciones) {
      throw new BadRequestException(
        "Fecha de indicaciones requerida"
      );
    }

    return this.prisma.paciente.update({
      where: { id },
      data: {
        estado: data.estado,
        consentimientoFirmado: data.consentimientoFirmado,
        indicacionesEnviadas: data.indicacionesEnviadas,
        fechaIndicaciones: data.indicacionesEnviadas
          ? new Date(data.fechaIndicaciones)
          : null,
      },
    });
  }

  private async updatePersonales(id: string, data: any) {
    if (!data.nombreCompleto || data.nombreCompleto.length < 3) {
      throw new BadRequestException("Nombre inválido");
    }

    return this.prisma.paciente.update({
      where: { id },
      data: {
        nombreCompleto: data.nombreCompleto,
        fechaNacimiento: data.fechaNacimiento
          ? new Date(data.fechaNacimiento)
          : null,
        direccion: data.direccion ?? null,
      },
    });
  }
}

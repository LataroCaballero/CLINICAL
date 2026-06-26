import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateEntradaDto } from './dto/crear-entrada.dto';
import { resolverNuevoFlujo } from './historia-clinica.flujo.helpers';
import {
  construirContenidoPrimeraVez,
  derivarPerfilPrimeraVez,
} from './historia-clinica.contenido.helpers';
import { CatalogoHCService } from '../catalogo-hc/catalogo-hc.service';

// Re-export so existing imports from this file still work
export { resolverNuevoFlujo };

@Injectable()
export class HistoriaClinicaService {
  private readonly logger = new Logger(HistoriaClinicaService.name);

  constructor(
    private prisma: PrismaService,
    private catalogoHc: CatalogoHCService,
  ) {}

  async obtenerHistoriaClinica(pacienteId: string) {
    const historia = await this.prisma.historiaClinica.findFirst({
      where: { pacienteId },
      include: {
        profesional: {
          include: {
            usuario: {
              select: {
                nombre: true,
                apellido: true,
              },
            },
          },
        },
        entradas: {
          orderBy: { fecha: 'desc' },
          include: {
            template: {
              select: {
                id: true,
                nombre: true,
              },
            },
            templateVersion: {
              select: {
                id: true,
                version: true,
                schema: true,
              },
            },
          },
        },
      },
    });

    if (!historia) return [];

    const profesionalNombre = historia.profesional?.usuario
      ? `${historia.profesional.usuario.nombre} ${historia.profesional.usuario.apellido}`
      : 'Profesional';

    return historia.entradas.map((entrada) => ({
      id: entrada.id,
      fecha: entrada.fecha,
      contenido: entrada.contenido,
      templateId: entrada.templateId,
      template: entrada.template,
      templateVersion: entrada.templateVersion,
      answers: entrada.answers,
      computed: entrada.computed,
      status: entrada.status,
      profesionalNombre,
    }));
  }

  async crearEntrada(
    pacienteId: string,
    dto: CreateEntradaDto,
    profesionalIdFromJwt?: string,
  ) {
    // Resolve profesionalId fuera de la transacción para no tener queries anidadas
    let profesionalId = profesionalIdFromJwt;
    if (!profesionalId) {
      const profesional = await this.prisma.profesional.findFirst();
      if (!profesional)
        throw new Error('No existe ningún profesional en la base de datos');
      profesionalId = profesional.id;
    }

    // Construir contenido JSONB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contenido: any;
    if (dto.tipo === 'primera_vez') {
      contenido = construirContenidoPrimeraVez({
        zonas: dto.zonas,
        diagnostico: dto.diagnostico,
        tratamientos: dto.tratamientos,
        comentario: dto.comentario,
        presupuestoId: dto.presupuestoId,
        presupuestoTotal: dto.presupuestoTotal,
      });
    } else if (dto.tipo === 'pre_quirurgico') {
      contenido = {
        tipo: 'pre_quirurgico',
        antecedentes: dto.antecedentes ?? [],
        alergias: dto.alergias ?? [],
        medicacion: dto.medicacion ?? [],
        estudiosComplementarios: dto.estudiosComplementarios ?? null,
        consentimientoInformadoAt: dto.consentimientoInformado
          ? new Date().toISOString()
          : null,
        comentario: dto.comentario ?? null,
      };
    } else if (dto.tipo === 'tratamiento_en_consultorio') {
      contenido = {
        tipo: 'tratamiento_en_consultorio',
        tratamientos: [], // will be filled after insumos pre-fetch below
        texto: dto.texto ?? '',
      };
    } else {
      contenido = { tipo: dto.tipo, texto: dto.texto ?? '' };
    }

    // Calcular strings de diagnóstico/tratamiento para actualizar el perfil
    let diagnosticoStr: string | null = null;
    let tratamientoStr: string | null = null;
    if (dto.tipo === 'primera_vez') {
      ({ diagnosticoStr, tratamientoStr } = derivarPerfilPrimeraVez({
        zonas: dto.zonas,
        diagnostico: dto.diagnostico,
        tratamientos: dto.tratamientos,
      }));
    }

    // Validar y preparar fecha retroactiva (antes de la transacción)
    let fechaFinal: Date | undefined;
    if (dto.fecha) {
      const parsed = new Date(dto.fecha);
      if (isNaN(parsed.getTime())) {
        throw new BadRequestException('Formato de fecha inválido.');
      }
      // Normalizar a fin-de-día para comparar solo fecha (hoy no es futuro)
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999);
      if (parsed > hoy) {
        throw new BadRequestException(
          'No se puede crear una entrada con fecha futura.',
        );
      }
      fechaFinal = parsed;
    }

    // Pre-fetch OS names for autorizaciones (outside tx to avoid nested queries)
    const autorizacionesMeta: Array<{
      obraSocialNombre: string;
      autIdx: number;
    }> = [];
    if (dto.tipo === 'primera_vez' && dto.autorizaciones?.length) {
      for (let i = 0; i < dto.autorizaciones.length; i++) {
        const aut = dto.autorizaciones[i];
        const os = await this.prisma.obraSocial.findUnique({
          where: { id: aut.obraSocialId },
          select: { nombre: true },
        });
        autorizacionesMeta.push({
          obraSocialNombre: os?.nombre ?? 'Obra Social',
          autIdx: i,
        });
      }
    }

    // Pre-fetch insumos for OrdenConsumo (outside tx — pgBouncer pattern)
    let insumosAgregados: Array<{ productoId: string; cantidad: number }> = [];
    let tratamientosSnapshot: Array<{ id: string; nombre: string }> = [];

    // Snapshot de tratamientos: SIEMPRE que haya tratamientoIds, independiente de
    // consumirInsumos (TRAT-03 / fix LIVHC-05). El findMany sigue fuera de la
    // transacción (patrón pgBouncer). La agregación de insumos para la OrdenConsumo
    // permanece condicionada a consumirInsumos=true más abajo.
    if (dto.tratamientoIds?.length) {
      const tratamientosConInsumos = await this.prisma.tratamiento.findMany({
        where: { id: { in: dto.tratamientoIds }, profesionalId, activo: true },
        select: {
          id: true,
          nombre: true,
          insumos: { select: { productoId: true, cantidad: true } },
        },
      });

      tratamientosSnapshot = tratamientosConInsumos.map((t) => ({
        id: t.id,
        nombre: t.nombre,
      }));

      // Persistir snapshot en el contenido SIEMPRE (puebla la columna "Último
      // tratamiento" de la planilla aunque no se consuman insumos)
      if (dto.tipo === 'tratamiento_en_consultorio') {
        contenido.tratamientos = tratamientosSnapshot;
      }

      // Agregación de insumos para la OrdenConsumo: SOLO si se consumen insumos.
      // Cuando consumirInsumos=false, insumosAgregados queda [] y la orden no se crea.
      if (dto.consumirInsumos) {
        // Aggregate quantities by productoId across all treatments (prevent duplicate rows)
        const insumosMap = new Map<string, number>();
        for (const t of tratamientosConInsumos) {
          for (const ins of t.insumos) {
            const prev = insumosMap.get(ins.productoId) ?? 0;
            insumosMap.set(ins.productoId, prev + Number(ins.cantidad));
          }
        }
        insumosAgregados = Array.from(insumosMap.entries()).map(
          ([productoId, cantidad]) => ({
            productoId,
            cantidad,
          }),
        );
      }
    }

    // Pre-fetch turno.esCirugia outside tx (pgBouncer pattern — same as other pre-fetches)
    const turnoCtx = dto.turnoId
      ? await this.prisma.turno.findUnique({
          where: { id: dto.turnoId },
          select: { esCirugia: true },
        })
      : null;

    // Una sola transacción: buscar/crear historia + crear entrada + actualizar paciente
    const entrada = await this.prisma.$transaction(async (tx) => {
      let historia = await tx.historiaClinica.findFirst({
        where: { pacienteId },
      });
      if (!historia) {
        historia = await tx.historiaClinica.create({
          data: { pacienteId, profesionalId },
        });
      }

      const entrada = await tx.historiaClinicaEntrada.create({
        data: {
          historiaClinicaId: historia.id,
          contenido,
          // pre_quirurgico forces tipoEntrada PREOPERATORIO regardless of what client passes
          tipoEntrada:
            dto.tipo === 'pre_quirurgico'
              ? 'PREOPERATORIO'
              : (dto.tipoEntrada ?? undefined),
          ...(fechaFinal && { fecha: fechaFinal }),
          // D-10: persist estudios in dedicated queryable column (PREOP-09)
          ...(dto.tipo === 'pre_quirurgico' && dto.estudiosComplementarios
            ? {
                estudiosComplementarios:
                  dto.estudiosComplementarios as unknown as Prisma.InputJsonValue,
              }
            : {}),
        },
      });

      // Resolve flujo transition (tipoEntrada classification logic)
      const pac = await tx.paciente.findUnique({
        where: { id: pacienteId },
        select: { flujo: true },
      });
      const nuevoFlujo = resolverNuevoFlujo(
        dto.tipoEntrada,
        pac?.flujo,
        turnoCtx?.esCirugia ?? false,
      );

      if (diagnosticoStr !== null || tratamientoStr !== null || nuevoFlujo) {
        await tx.paciente.update({
          where: { id: pacienteId },
          data: {
            ...(diagnosticoStr !== null && { diagnostico: diagnosticoStr }),
            ...(tratamientoStr !== null && { tratamiento: tratamientoStr }),
            ...(nuevoFlujo && { flujo: nuevoFlujo }),
          },
        });
      }

      // D-09: Union-dedup profile merge for pre_quirurgico
      // Merges confirmed antecedentes→condiciones, alergias, medicacion into the patient
      // profile. NEVER replaces — existing values are always preserved. Does NOT touch
      // consentimientoFirmadoAt or *AutoReportada(o)s staging fields (D-11 / T-52-07).
      if (dto.tipo === 'pre_quirurgico') {
        const perfil = await tx.paciente.findUnique({
          where: { id: pacienteId },
          select: { condiciones: true, alergias: true, medicacion: true },
        });
        if (perfil) {
          await tx.paciente.update({
            where: { id: pacienteId },
            data: {
              condiciones: Array.from(
                new Set([...perfil.condiciones, ...(dto.antecedentes ?? [])]),
              ),
              alergias: Array.from(
                new Set([...perfil.alergias, ...(dto.alergias ?? [])]),
              ),
              medicacion: Array.from(
                new Set([...perfil.medicacion, ...(dto.medicacion ?? [])]),
              ),
            },
          });
        }
      }

      // Inline autorizaciones de obra social
      if (dto.tipo === 'primera_vez' && dto.autorizaciones?.length) {
        for (const meta of autorizacionesMeta) {
          const autDto = dto.autorizaciones[meta.autIdx];
          const codigosStr = autDto.codigos
            .map((c) => `${c.codigo} - ${c.descripcion}`)
            .join(', ');

          await tx.autorizacionObraSocial.create({
            data: {
              pacienteId,
              obraSocialId: autDto.obraSocialId,
              profesionalId,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              codigos: autDto.codigos as any,
              estado: 'PENDIENTE',
            },
          });

          await tx.contactoLog.create({
            data: {
              pacienteId,
              profesionalId,
              tipo: 'SISTEMA',
              nota: `Códigos pendientes de autorización con ${meta.obraSocialNombre}: ${codigosStr}`,
            },
          });
        }
      }

      // Create OrdenConsumo if consumirInsumos requested and treatments have insumos
      if (dto.consumirInsumos && insumosAgregados.length > 0) {
        await tx.ordenConsumo.create({
          data: {
            pacienteId,
            profesionalId,
            turnoId: dto.turnoId ?? null,
            historiaClinicaEntradaId: entrada.id,
            fechaSesion: fechaFinal ?? new Date(),
            estado: 'PENDIENTE',
            tratamientosSnapshot,
            insumos: {
              create: insumosAgregados,
            },
          },
        });
      }

      return entrada;
    });

    // Best-effort catalog learning — must run AFTER the transaction commits so only
    // successfully saved HC entries enrich the catalog. Never blocks the response.
    if (
      dto.tipo === 'primera_vez' &&
      Array.isArray(dto.zonas) &&
      dto.zonas.length > 0
    ) {
      try {
        await this.catalogoHc.aprenderDesdeZonas(
          profesionalId,
          dto.zonas.map((z) => ({
            zona: z.zona,
            diagnosticos: z.diagnosticos ?? [],
            tratamientos: (z.tratamientos ?? []).map((t) => ({
              nombre: t.nombre,
            })),
          })),
        );
      } catch (e) {
        this.logger.warn(
          `Aprendizaje de catálogo HC falló (no bloqueante): ${e?.message ?? e}`,
        );
      }
    }

    // D-06: Best-effort flat catalog learning for pre_quirurgico
    // Runs post-transaction so a learning failure never rolls back the saved entry.
    // aprenderDesdePreoperatorio already guards per-section; outer try/catch is extra safety.
    // SECURITY: profesionalId is the JWT-derived argument, never from dto (T-52-06).
    if (dto.tipo === 'pre_quirurgico') {
      try {
        await this.catalogoHc.aprenderDesdePreoperatorio(profesionalId, {
          antecedentes: dto.antecedentes ?? [],
          alergias: dto.alergias ?? [],
          medicacion: dto.medicacion ?? [],
        });
      } catch (e) {
        this.logger.warn(
          `Aprendizaje preoperatorio HC falló (no bloqueante): ${(e as Error)?.message ?? e}`,
        );
      }
    }

    return entrada;
  }
}

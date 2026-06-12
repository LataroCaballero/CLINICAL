import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SEED_ZONAS, normalizarNombre } from './catalogo-hc.seed-data';

export interface ZonaHCResponse {
  id: string;
  nombre: string;
  orden: number;
  esSistema: boolean;
  diagnosticos: {
    id: string;
    nombre: string;
    orden: number;
    esSistema: boolean;
  }[];
  tratamientos: {
    id: string;
    nombre: string;
    orden: number;
    esSistema: boolean;
    tratamientoId: string | null;
    precio: number | null;
  }[];
}

@Injectable()
export class CatalogoHCService {
  private readonly logger = new Logger(CatalogoHCService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Atomic unit: creates a ZonaHC with its mandatory "Otros" diagnostic
   * and "Otros" treatment (esSistema=true, orden=9999).
   *
   * IDEMPOTENT: if the zone already exists, returns it without creating anything.
   * Phase 46 reuses this helper to add new user-defined zones (APR-01).
   */
  async crearZona(
    profesionalId: string,
    nombre: string,
    orden: number,
    esSistema = false,
  ) {
    // Idempotency check
    const existing = await this.prisma.zonaHC.findUnique({
      where: {
        nombre_profesionalId: { nombre, profesionalId },
      },
    });

    if (existing) {
      return existing;
    }

    // Create zone + system items atomically
    return this.prisma.$transaction(async (tx) => {
      const zona = await tx.zonaHC.create({
        data: { nombre, orden, esSistema, profesionalId },
      });

      await tx.diagnosticoHC.create({
        data: {
          nombre: 'Otros',
          orden: 9999,
          esSistema: true,
          zonaId: zona.id,
          profesionalId,
        },
      });

      await tx.tratamientoHC.create({
        data: {
          nombre: 'Otros',
          orden: 9999,
          esSistema: true,
          zonaId: zona.id,
          profesionalId,
          tratamientoId: null,
        },
      });

      return zona;
    });
  }

  /**
   * Full seed from SEED_ZONAS.
   * IDEMPOTENT: if the professional already has any zones, returns immediately.
   * The price match is case/accent-insensitive via normalizarNombre().
   */
  async seedCatalogoInicial(profesionalId: string): Promise<void> {
    // Guard: if any zones exist (even inactive), skip
    const count = await this.prisma.zonaHC.count({ where: { profesionalId } });
    if (count > 0) {
      return;
    }

    // Load price catalog once, build a normalized lookup map
    const tratamientos = await this.prisma.tratamiento.findMany({
      where: { profesionalId, activo: true },
      select: { id: true, nombre: true },
    });

    const matchMap = new Map<string, string>();
    for (const t of tratamientos) {
      matchMap.set(normalizarNombre(t.nombre), t.id);
    }

    // Seed each zone
    for (const seedZona of SEED_ZONAS) {
      // crearZona creates the zone + its system "Otros" diagnostic/treatment
      const zona = await this.crearZona(
        profesionalId,
        seedZona.nombre,
        seedZona.orden,
        seedZona.esSistema,
      );

      // Add non-system diagnostics (orden = position 1..N)
      if (seedZona.diagnosticos.length > 0) {
        await this.prisma.diagnosticoHC.createMany({
          data: seedZona.diagnosticos.map((nombre, i) => ({
            nombre,
            orden: i + 1,
            esSistema: false,
            zonaId: zona.id,
            profesionalId,
          })),
          skipDuplicates: true,
        });
      }

      // Add non-system treatments with optional price FK match
      if (seedZona.tratamientos.length > 0) {
        await this.prisma.tratamientoHC.createMany({
          data: seedZona.tratamientos.map((nombre, i) => ({
            nombre,
            orden: i + 1,
            esSistema: false,
            zonaId: zona.id,
            profesionalId,
            tratamientoId: matchMap.get(normalizarNombre(nombre)) ?? null,
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  /**
   * Lazy seed + nested catalog.
   * If no catalog exists for this professional, seeds it first.
   * Returns ZonaHCResponse[] matching the Phase 45 / 44-03 contract exactly.
   */
  async getCatalogoConSeed(profesionalId: string): Promise<ZonaHCResponse[]> {
    const count = await this.prisma.zonaHC.count({ where: { profesionalId } });
    if (count === 0) {
      await this.seedCatalogoInicial(profesionalId);
    }

    const zonas = await this.prisma.zonaHC.findMany({
      where: { profesionalId, activo: true },
      orderBy: { orden: 'asc' },
      include: {
        diagnosticos: {
          where: { activo: true },
          orderBy: { orden: 'asc' },
        },
        tratamientos: {
          where: { activo: true },
          orderBy: { orden: 'asc' },
          include: {
            tratamiento: {
              select: { id: true, precio: true },
            },
          },
        },
      },
    });

    return zonas.map((zona) => ({
      id: zona.id,
      nombre: zona.nombre,
      orden: zona.orden,
      esSistema: zona.esSistema,
      diagnosticos: zona.diagnosticos.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        orden: d.orden,
        esSistema: d.esSistema,
      })),
      tratamientos: zona.tratamientos.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        orden: t.orden,
        esSistema: t.esSistema,
        tratamientoId: t.tratamientoId ?? null,
        precio: t.tratamiento ? Number(t.tratamiento.precio) : null,
      })),
    }));
  }
}

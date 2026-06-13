import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SEED_ZONAS, normalizarNombre } from './catalogo-hc.seed-data';
import {
  ZonaAprendizajeInput,
  detectarAprendizaje,
} from './catalogo-hc.aprendizaje.helpers';

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

  /**
   * Apply learning from a primera_vez HC entry.
   *
   * Loads the professional's full catalog snapshot (including inactive items),
   * computes which zones/diagnostics/treatments are new or need reactivation,
   * then applies the changes sequentially outside a long transaction
   * (pgBouncer-safe — crearZona handles its own $transaction internally).
   *
   * APR-04: each new TratamientoHC gets linked to an existing Tratamiento via
   * case/accent-insensitive match, or a new Tratamiento (precio=0) is created.
   *
   * Does NOT catch errors — the caller (crearEntrada) wraps in try/catch (best-effort).
   */
  async aprenderDesdeZonas(
    profesionalId: string,
    zonas: ZonaAprendizajeInput[],
  ): Promise<void> {
    // 1. Load snapshot (including inactive for reactivation detection)
    const rawZonas = await this.prisma.zonaHC.findMany({
      where: { profesionalId },
      include: {
        diagnosticos: true,
        tratamientos: true,
      },
    });

    // Map to SnapshotZona shape
    const snapshot = rawZonas.map((z) => ({
      id: z.id,
      nombre: z.nombre,
      activo: z.activo,
      orden: z.orden,
      esSistema: z.esSistema,
      diagnosticos: z.diagnosticos.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        activo: d.activo,
      })),
      tratamientos: z.tratamientos.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        activo: t.activo,
      })),
    }));

    // 2. Detect what needs to be created/reactivated
    const acciones = detectarAprendizaje(snapshot, zonas);

    const noHayNada =
      acciones.zonasACrear.length === 0 &&
      acciones.zonasAReactivar.length === 0 &&
      acciones.diagnosticosACrear.length === 0 &&
      acciones.diagnosticosAReactivar.length === 0 &&
      acciones.tratamientosACrear.length === 0 &&
      acciones.tratamientosAReactivar.length === 0;

    if (noHayNada) return;

    // 3. Reactivations (updateMany only if list is non-empty)
    if (acciones.zonasAReactivar.length > 0) {
      await this.prisma.zonaHC.updateMany({
        where: { id: { in: acciones.zonasAReactivar } },
        data: { activo: true },
      });
    }
    if (acciones.diagnosticosAReactivar.length > 0) {
      await this.prisma.diagnosticoHC.updateMany({
        where: { id: { in: acciones.diagnosticosAReactivar } },
        data: { activo: true },
      });
    }
    if (acciones.tratamientosAReactivar.length > 0) {
      await this.prisma.tratamientoHC.updateMany({
        where: { id: { in: acciones.tratamientosAReactivar } },
        data: { activo: true },
      });
    }

    // 4. Create new zones and build a name→id map for dx/tx attachment
    // ordenSiguiente: max orden of non-system zones + 1
    const maxOrdenNoSistema = rawZonas
      .filter((z) => !z.esSistema)
      .reduce((max, z) => Math.max(max, z.orden), 0);

    // Combined map: normKey → zonaId (from snapshot + newly created)
    const zonaIdMap = new Map<string, string>();
    for (const z of rawZonas) {
      zonaIdMap.set(normalizarNombre(z.nombre), z.id);
    }

    let ordenSiguiente = maxOrdenNoSistema + 1;
    for (const nombre of acciones.zonasACrear) {
      const zona = await this.crearZona(profesionalId, nombre, ordenSiguiente++);
      zonaIdMap.set(normalizarNombre(nombre), zona.id);
    }

    // 5. Create new diagnostics
    // Track next orden per zone (from snapshot data + increment per new dx in same zone)
    const dxOrdenMap = new Map<string, number>(); // zonaId → next orden
    const resolveNextDxOrden = (zonaId: string): number => {
      if (!dxOrdenMap.has(zonaId)) {
        // Find max non-system dx orden in snapshot for this zone
        const zona = rawZonas.find((z) => z.id === zonaId);
        const maxOrden = zona
          ? zona.diagnosticos
              .filter((d) => !d.esSistema)
              .reduce((max, d) => Math.max(max, d.orden ?? 0), 0)
          : 0;
        dxOrdenMap.set(zonaId, maxOrden + 1);
      }
      const next = dxOrdenMap.get(zonaId)!;
      dxOrdenMap.set(zonaId, next + 1);
      return next;
    };

    for (const { zonaNombre, nombre } of acciones.diagnosticosACrear) {
      const zonaId = zonaIdMap.get(normalizarNombre(zonaNombre));
      if (!zonaId) {
        this.logger.warn(
          `aprenderDesdeZonas: zonaId no encontrado para zonaNombre="${zonaNombre}" al crear diagnóstico "${nombre}"`,
        );
        continue;
      }
      const orden = resolveNextDxOrden(zonaId);
      await this.prisma.diagnosticoHC.create({
        data: {
          nombre,
          orden,
          esSistema: false,
          zonaId,
          profesionalId,
        },
      });
    }

    // 6. Tratamientos nuevos (APR-04): resolve FK to price catalog
    // Load price catalog once
    let matchMap: Map<string, string> | null = null;
    if (acciones.tratamientosACrear.length > 0) {
      const tratamientos = await this.prisma.tratamiento.findMany({
        where: { profesionalId },
        select: { id: true, nombre: true },
      });
      matchMap = new Map<string, string>();
      for (const t of tratamientos) {
        matchMap.set(normalizarNombre(t.nombre), t.id);
      }
    }

    // Track next orden per zone for tratamientos
    const txOrdenMap = new Map<string, number>(); // zonaId → next orden
    const resolveNextTxOrden = (zonaId: string): number => {
      if (!txOrdenMap.has(zonaId)) {
        const zona = rawZonas.find((z) => z.id === zonaId);
        const maxOrden = zona
          ? zona.tratamientos
              .filter((t) => !t.esSistema)
              .reduce((max, t) => Math.max(max, t.orden), 0)
          : 0;
        txOrdenMap.set(zonaId, maxOrden + 1);
      }
      const next = txOrdenMap.get(zonaId)!;
      txOrdenMap.set(zonaId, next + 1);
      return next;
    };

    for (const { zonaNombre, nombre } of acciones.tratamientosACrear) {
      const zonaId = zonaIdMap.get(normalizarNombre(zonaNombre));
      if (!zonaId) {
        this.logger.warn(
          `aprenderDesdeZonas: zonaId no encontrado para zonaNombre="${zonaNombre}" al crear tratamiento "${nombre}"`,
        );
        continue;
      }

      const normNombre = normalizarNombre(nombre);
      let tratamientoId: string;

      if (matchMap!.has(normNombre)) {
        // Match exists: reuse existing Tratamiento FK
        tratamientoId = matchMap!.get(normNombre)!;
      } else {
        // No match: create Tratamiento at precio 0
        const nuevoTratamiento = await this.prisma.tratamiento.create({
          data: {
            nombre,
            precio: 0,
            profesionalId,
          },
        });
        tratamientoId = nuevoTratamiento.id;
        // Add to matchMap to avoid duplicate creation if same tx appears in another zone
        matchMap!.set(normNombre, tratamientoId);
      }

      const orden = resolveNextTxOrden(zonaId);
      await this.prisma.tratamientoHC.create({
        data: {
          nombre,
          orden,
          esSistema: false,
          zonaId,
          profesionalId,
          tratamientoId,
        },
      });
    }
  }
}

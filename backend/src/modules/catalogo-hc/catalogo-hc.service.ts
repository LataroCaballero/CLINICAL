import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  SEED_ANTECEDENTES,
  SEED_ZONAS,
  normalizarNombre,
} from './catalogo-hc.seed-data';
import { SEED_ALERGIAS } from '../catalogo-preop/alergia-catalogo.seed-data';
import { SEED_MEDICAMENTOS } from '../catalogo-preop/medicamento-catalogo.seed-data';
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
    const includeActivos = {
      diagnosticos: {
        where: { activo: true },
        orderBy: { orden: 'asc' as const },
      },
      tratamientos: {
        where: { activo: true },
        orderBy: { orden: 'asc' as const },
        include: {
          tratamiento: {
            select: { id: true, precio: true },
          },
        },
      },
    };

    // Caso común (catálogo ya sembrado): una sola query.
    // Solo si no hay zonas activas sembramos y volvemos a leer — evita el count
    // extra en cada carga (un round-trip menos contra el pooler).
    let zonas = await this.prisma.zonaHC.findMany({
      where: { profesionalId, activo: true },
      orderBy: { orden: 'asc' },
      include: includeActivos,
    });

    if (zonas.length === 0) {
      await this.seedCatalogoInicial(profesionalId);
      zonas = await this.prisma.zonaHC.findMany({
        where: { profesionalId, activo: true },
        orderBy: { orden: 'asc' },
        include: includeActivos,
      });
    }

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

  // ---------------------------------------------------------------------------
  // Flat per-professional catalog — antecedentes / alergias / medicamentos
  // ---------------------------------------------------------------------------

  /**
   * Idempotently seeds AntecedenteCatalogoPro for a professional.
   * Count guard: if any rows exist (including inactive), skips to avoid duplicates.
   */
  async seedAntecedentesInicial(profesionalId: string): Promise<void> {
    const count = await this.prisma.antecedenteCatalogoPro.count({
      where: { profesionalId },
    });
    if (count > 0) return;
    await this.prisma.antecedenteCatalogoPro.createMany({
      data: SEED_ANTECEDENTES.map((nombre) => ({
        nombre,
        profesionalId,
        esSistema: true,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Idempotently seeds AlergiaCatalogoPro for a professional.
   */
  async seedAlergiasInicial(profesionalId: string): Promise<void> {
    const count = await this.prisma.alergiaCatalogoPro.count({
      where: { profesionalId },
    });
    if (count > 0) return;
    await this.prisma.alergiaCatalogoPro.createMany({
      data: SEED_ALERGIAS.map((nombre) => ({
        nombre,
        profesionalId,
        esSistema: true,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Idempotently seeds MedicamentoCatalogoPro for a professional.
   */
  async seedMedicamentosInicial(profesionalId: string): Promise<void> {
    const count = await this.prisma.medicamentoCatalogoPro.count({
      where: { profesionalId },
    });
    if (count > 0) return;
    await this.prisma.medicamentoCatalogoPro.createMany({
      data: SEED_MEDICAMENTOS.map((nombre) => ({
        nombre,
        profesionalId,
        esSistema: true,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Lazy-seed list getter for antecedentes.
   * Returns active rows ordered by esSistema desc then nombre asc.
   * On first access (empty catalog), seeds from SEED_ANTECEDENTES.
   */
  async getAntecedentesConSeed(profesionalId: string): Promise<
    {
      id: string;
      nombre: string;
      esSistema: boolean;
      activo: boolean;
      profesionalId: string;
    }[]
  > {
    const order = [{ esSistema: 'desc' as const }, { nombre: 'asc' as const }];
    let items = await this.prisma.antecedenteCatalogoPro.findMany({
      where: { profesionalId, activo: true },
      orderBy: order,
    });
    if (items.length === 0) {
      await this.seedAntecedentesInicial(profesionalId);
      items = await this.prisma.antecedenteCatalogoPro.findMany({
        where: { profesionalId, activo: true },
        orderBy: order,
      });
    }
    return items;
  }

  /**
   * Lazy-seed list getter for alergias.
   */
  async getAlergiasConSeed(profesionalId: string): Promise<
    {
      id: string;
      nombre: string;
      esSistema: boolean;
      activo: boolean;
      profesionalId: string;
    }[]
  > {
    const order = [{ esSistema: 'desc' as const }, { nombre: 'asc' as const }];
    let items = await this.prisma.alergiaCatalogoPro.findMany({
      where: { profesionalId, activo: true },
      orderBy: order,
    });
    if (items.length === 0) {
      await this.seedAlergiasInicial(profesionalId);
      items = await this.prisma.alergiaCatalogoPro.findMany({
        where: { profesionalId, activo: true },
        orderBy: order,
      });
    }
    return items;
  }

  /**
   * Lazy-seed list getter for medicamentos.
   */
  async getMedicamentosConSeed(profesionalId: string): Promise<
    {
      id: string;
      nombre: string;
      esSistema: boolean;
      activo: boolean;
      profesionalId: string;
    }[]
  > {
    const order = [{ esSistema: 'desc' as const }, { nombre: 'asc' as const }];
    let items = await this.prisma.medicamentoCatalogoPro.findMany({
      where: { profesionalId, activo: true },
      orderBy: order,
    });
    if (items.length === 0) {
      await this.seedMedicamentosInicial(profesionalId);
      items = await this.prisma.medicamentoCatalogoPro.findMany({
        where: { profesionalId, activo: true },
        orderBy: order,
      });
    }
    return items;
  }

  /**
   * Generic private learning helper for flat (non-nested) catalog models.
   *
   * Loads a full snapshot (including inactive rows) for the professional,
   * builds a normalizarNombre→{id, activo} map, then for each incoming name:
   *   - absent → create (esSistema:false)
   *   - inactive → reactivate (activo:true)
   *   - already active → no-op
   *
   * Does NOT throw — caller catches per-section.
   */
  private async aprenderDesdeFlat(
    profesionalId: string,
    nombres: string[],
    modelo:
      | 'antecedenteCatalogoPro'
      | 'alergiaCatalogoPro'
      | 'medicamentoCatalogoPro',
  ): Promise<void> {
    if (nombres.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (this.prisma as any)[modelo] as {
      findMany: (
        args: any,
      ) => Promise<{ id: string; nombre: string; activo: boolean }[]>;
      create: (args: any) => Promise<unknown>;
      updateMany: (args: any) => Promise<{ count: number }>;
    };

    const snapshot = await delegate.findMany({
      where: { profesionalId },
      select: { id: true, nombre: true, activo: true },
    });

    const normMap = new Map<string, { id: string; activo: boolean }>();
    for (const row of snapshot) {
      normMap.set(normalizarNombre(row.nombre), {
        id: row.id,
        activo: row.activo,
      });
    }

    const toReactivate: string[] = [];
    const toCreate: string[] = [];

    for (const nombre of nombres) {
      const norm = normalizarNombre(nombre);
      const existing = normMap.get(norm);
      if (!existing) {
        toCreate.push(nombre);
      } else if (!existing.activo) {
        toReactivate.push(existing.id);
      }
      // existing + activo → no-op
    }

    if (toReactivate.length > 0) {
      await delegate.updateMany({
        where: { id: { in: toReactivate } },
        data: { activo: true },
      });
    }

    for (const nombre of toCreate) {
      await delegate.create({
        data: { nombre, profesionalId, esSistema: false },
      });
    }
  }

  /**
   * Best-effort learning upsert for the three flat catalog sections.
   *
   * Called after a prequirúrgico HC entry is saved (Plan 03).
   * Each section is wrapped individually — a failure in one does not
   * prevent learning from the others. Never throws.
   *
   * SECURITY: profesionalId comes from the JWT-resolved scope, never from
   * the request body (T-52-03 / T-52-05).
   */
  async aprenderDesdePreoperatorio(
    profesionalId: string,
    {
      antecedentes = [],
      alergias = [],
      medicacion = [],
    }: {
      antecedentes?: string[];
      alergias?: string[];
      medicacion?: string[];
    },
  ): Promise<void> {
    if (antecedentes.length > 0) {
      try {
        await this.aprenderDesdeFlat(
          profesionalId,
          antecedentes,
          'antecedenteCatalogoPro',
        );
      } catch (err) {
        this.logger.warn(
          'aprenderDesdePreoperatorio: error aprendiendo antecedentes',
          err,
        );
      }
    }

    if (alergias.length > 0) {
      try {
        await this.aprenderDesdeFlat(
          profesionalId,
          alergias,
          'alergiaCatalogoPro',
        );
      } catch (err) {
        this.logger.warn(
          'aprenderDesdePreoperatorio: error aprendiendo alergias',
          err,
        );
      }
    }

    if (medicacion.length > 0) {
      try {
        await this.aprenderDesdeFlat(
          profesionalId,
          medicacion,
          'medicamentoCatalogoPro',
        );
      } catch (err) {
        this.logger.warn(
          'aprenderDesdePreoperatorio: error aprendiendo medicacion',
          err,
        );
      }
    }
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
      const zona = await this.crearZona(
        profesionalId,
        nombre,
        ordenSiguiente++,
      );
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

  // ---------------------------------------------------------------------------
  // Rename helpers
  // ---------------------------------------------------------------------------

  /**
   * Renames a ZonaHC. Guards: belongs to profesional, not esSistema.
   * Throws ConflictException on duplicate name (P2002).
   */
  async renombrarZona(profesionalId: string, zonaId: string, nombre: string) {
    const zona = await this.prisma.zonaHC.findUnique({ where: { id: zonaId } });
    if (!zona || zona.profesionalId !== profesionalId) {
      throw new NotFoundException('Zona no encontrada');
    }
    if (zona.esSistema) {
      throw new ForbiddenException('No se puede modificar un ítem del sistema');
    }
    try {
      return await this.prisma.zonaHC.update({
        where: { id: zonaId },
        data: { nombre },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          'Ya existe un ítem con ese nombre en este perfil',
        );
      }
      throw err;
    }
  }

  /**
   * Saves or clears the indicacionesUrl for a ZonaHC (CONS-02).
   * Ownership guard mirrors renombrarZona: NotFoundException for non-owned or missing zona.
   * profesionalId comes from JWT scope — never from request body (T-53-08).
   * Allows null to clear the URL (D-02 / T-53-11 @IsUrl validated in DTO).
   */
  async actualizarIndicacionesUrl(
    profesionalId: string,
    zonaId: string,
    indicacionesUrl: string | null,
  ) {
    if (indicacionesUrl !== null) {
      if (indicacionesUrl.length > 2048) {
        throw new BadRequestException('URL de indicaciones demasiado larga (máx 2048 caracteres)');
      }
      let parsed: URL;
      try {
        parsed = new URL(indicacionesUrl);
      } catch {
        throw new BadRequestException('URL de indicaciones inválida');
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new BadRequestException('URL de indicaciones debe usar protocolo http o https');
      }
    }
    const zona = await this.prisma.zonaHC.findUnique({ where: { id: zonaId } });
    if (!zona || zona.profesionalId !== profesionalId) {
      throw new NotFoundException('Zona no encontrada');
    }
    return this.prisma.zonaHC.update({
      where: { id: zonaId },
      data: { indicacionesUrl },
    });
  }

  /**
   * Renames a DiagnosticoHC. Guards: belongs to profesional, not esSistema.
   * Throws ConflictException on duplicate name (P2002).
   */
  async renombrarDiagnostico(
    profesionalId: string,
    diagnosticoId: string,
    nombre: string,
  ) {
    const dx = await this.prisma.diagnosticoHC.findUnique({
      where: { id: diagnosticoId },
    });
    if (!dx || dx.profesionalId !== profesionalId) {
      throw new NotFoundException('Diagnóstico no encontrado');
    }
    if (dx.esSistema) {
      throw new ForbiddenException('No se puede modificar un ítem del sistema');
    }
    try {
      return await this.prisma.diagnosticoHC.update({
        where: { id: diagnosticoId },
        data: { nombre },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          'Ya existe un ítem con ese nombre en esta zona',
        );
      }
      throw err;
    }
  }

  /**
   * Renames a TratamientoHC. Guards: belongs to profesional, not esSistema.
   * Throws ConflictException on duplicate name (P2002).
   */
  async renombrarTratamiento(
    profesionalId: string,
    tratamientoHCId: string,
    nombre: string,
  ) {
    const tx = await this.prisma.tratamientoHC.findUnique({
      where: { id: tratamientoHCId },
    });
    if (!tx || tx.profesionalId !== profesionalId) {
      throw new NotFoundException('Tratamiento no encontrado');
    }
    if (tx.esSistema) {
      throw new ForbiddenException('No se puede modificar un ítem del sistema');
    }
    try {
      return await this.prisma.tratamientoHC.update({
        where: { id: tratamientoHCId },
        data: { nombre },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          'Ya existe un ítem con ese nombre en esta zona',
        );
      }
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Soft-delete helpers
  // ---------------------------------------------------------------------------

  /**
   * Soft-deletes a ZonaHC (activo=false) and cascades to its DiagnosticoHC
   * and TratamientoHC rows via logical updateMany.
   * Guards: belongs to profesional, not esSistema.
   * NEVER calls prisma.*.delete().
   */
  async eliminarZona(profesionalId: string, zonaId: string) {
    const zona = await this.prisma.zonaHC.findUnique({ where: { id: zonaId } });
    if (!zona || zona.profesionalId !== profesionalId) {
      throw new NotFoundException('Zona no encontrada');
    }
    if (zona.esSistema) {
      throw new ForbiddenException('No se puede eliminar un ítem del sistema');
    }
    await this.prisma.$transaction([
      this.prisma.zonaHC.update({
        where: { id: zonaId },
        data: { activo: false },
      }),
      this.prisma.diagnosticoHC.updateMany({
        where: { zonaId },
        data: { activo: false },
      }),
      this.prisma.tratamientoHC.updateMany({
        where: { zonaId },
        data: { activo: false },
      }),
    ]);
  }

  /**
   * Soft-deletes a DiagnosticoHC (activo=false).
   * Guards: belongs to profesional, not esSistema.
   */
  async eliminarDiagnostico(profesionalId: string, diagnosticoId: string) {
    const dx = await this.prisma.diagnosticoHC.findUnique({
      where: { id: diagnosticoId },
    });
    if (!dx || dx.profesionalId !== profesionalId) {
      throw new NotFoundException('Diagnóstico no encontrado');
    }
    if (dx.esSistema) {
      throw new ForbiddenException('No se puede eliminar un ítem del sistema');
    }
    return this.prisma.diagnosticoHC.update({
      where: { id: diagnosticoId },
      data: { activo: false },
    });
  }

  /**
   * Soft-deletes a TratamientoHC (activo=false).
   * Guards: belongs to profesional, not esSistema.
   */
  async eliminarTratamiento(profesionalId: string, tratamientoHCId: string) {
    const tx = await this.prisma.tratamientoHC.findUnique({
      where: { id: tratamientoHCId },
    });
    if (!tx || tx.profesionalId !== profesionalId) {
      throw new NotFoundException('Tratamiento no encontrado');
    }
    if (tx.esSistema) {
      throw new ForbiddenException('No se puede eliminar un ítem del sistema');
    }
    return this.prisma.tratamientoHC.update({
      where: { id: tratamientoHCId },
      data: { activo: false },
    });
  }
}

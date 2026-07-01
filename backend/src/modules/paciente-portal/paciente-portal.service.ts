import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ConsentStampService } from '../consentimientos/consent-stamp.service';
import { UpdateContactoPortalDto } from './dto/update-contacto-portal.dto';
import { UpdateSaludStagedDto } from './dto/update-salud-staged.dto';
import { CreateConsultaPortalDto } from './dto/create-consulta-portal.dto';
import { FirmarConsentimientoPortalDto } from './dto/firmar-consentimiento-portal.dto';

/**
 * Patient-portal service: hash-based token lookup, DNI verification with a
 * persistent brute-force lock, short portal-scoped JWT emission, the
 * authenticated read payload, and the two writes confined to the safe surface.
 *
 * Security invariants:
 * - The raw URL token is NEVER stored/compared raw — it is SHA-256 hashed and
 *   looked up against `Paciente.portalToken` (T-54-04). An unknown token → 404
 *   with no patient data (D-07).
 * - The authenticated read NEVER exposes curated staff-only clinical arrays nor
 *   CRM-routing columns — only editable contact, read-only context and the
 *   `*AutoReportad*` staged values (D-08/D-09).
 * - The two write methods build the prisma `data` object from an allow-list of
 *   keys, so curated clinical fields can never be mass-assigned (T-54-06/SC#4).
 */
@Injectable()
export class PacientePortalService {
  /** Brute-force lock: failures before block, and block duration (D-01/D-02/D-03). */
  private static readonly MAX_INTENTOS = 3;
  private static readonly BLOQUEO_MS = 15 * 60 * 1000; // 15 min

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private readonly storage: StorageService,
    private readonly stamp: ConsentStampService,
  ) {}

  /** SHA-256 of the raw URL token → the 64-char hex stored in `portalToken`. */
  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Look up a patient by the HASH of the raw URL token (never the raw value).
   * Throws `NotFoundException` (404, no patient data) when the token is unknown.
   */
  private async findByRawToken(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const paciente = await this.prisma.paciente.findUnique({
      where: { portalToken: tokenHash },
      select: {
        id: true,
        dni: true,
        portalIntentosFallidos: true,
        portalBloqueadoHasta: true,
      },
    });
    if (!paciente) throw new NotFoundException(); // D-07: no patient data leaked
    return paciente;
  }

  /**
   * Pre-verification (Plan 03 `@Get(':token')`, public): returns ONLY existence
   * (200) plus a `bloqueado` flag for the 429 UX — NO name, NO patient data (D-07).
   * An unknown token surfaces as 404 from `findByRawToken`.
   */
  async preVerify(
    rawToken: string,
  ): Promise<{ existe: true; bloqueado: boolean }> {
    const paciente = await this.findByRawToken(rawToken);
    const bloqueado =
      !!paciente.portalBloqueadoHasta &&
      paciente.portalBloqueadoHasta.getTime() > Date.now();
    return { existe: true, bloqueado };
  }

  /**
   * Authenticated read (Plan 03 JWT-guarded `@Get()`): editable contact +
   * read-only context + staged `*AutoReportad*` pre-fill values. NEVER returns
   * the curated staff-only clinical arrays nor CRM-routing columns
   * (D-08/D-09, PORTAL-04).
   */
  async getDatos(pacienteId: string) {
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: {
        // read-only context
        nombreCompleto: true,
        dni: true,
        obraSocial: { select: { nombre: true } },
        // editable contact
        telefono: true,
        telefonoAlternativo: true,
        email: true,
        direccion: true,
        contactoEmergenciaNombre: true,
        contactoEmergenciaTelefono: true,
        contactoEmergenciaRelacion: true,
        // staged self-reported (pre-fill) values
        alergiasAutoReportadas: true,
        antecedentesAutoReportados: true,
        medicacionAutoReportada: true,
        tratamientosPreviosAutoReportados: true,
      },
    });
    if (!paciente) throw new NotFoundException();

    // Read-only: próxima cirugía programada (if any) — context only, never editable.
    const proximaCirugia = await this.prisma.cirugia.findFirst({
      where: {
        pacienteId,
        fecha: { gt: new Date() },
        estado: 'PROGRAMADA',
      },
      orderBy: { fecha: 'asc' },
      select: { fecha: true, procedimiento: true },
    });

    return {
      // read-only context
      nombreCompleto: paciente.nombreCompleto,
      dni: paciente.dni,
      obraSocial: paciente.obraSocial?.nombre ?? null,
      proximaCirugia: proximaCirugia
        ? {
            fecha: proximaCirugia.fecha,
            procedimiento: proximaCirugia.procedimiento,
          }
        : null,
      // editable contact
      contacto: {
        telefono: paciente.telefono,
        telefonoAlternativo: paciente.telefonoAlternativo,
        email: paciente.email,
        direccion: paciente.direccion,
        contactoEmergenciaNombre: paciente.contactoEmergenciaNombre,
        contactoEmergenciaTelefono: paciente.contactoEmergenciaTelefono,
        contactoEmergenciaRelacion: paciente.contactoEmergenciaRelacion,
      },
      // staged self-reported pre-fill values (never the curated clinical fields)
      saludAutoReportada: {
        alergiasAutoReportadas: paciente.alergiasAutoReportadas,
        antecedentesAutoReportados: paciente.antecedentesAutoReportados,
        medicacionAutoReportada: paciente.medicacionAutoReportada,
        tratamientosPreviosAutoReportados:
          paciente.tratamientosPreviosAutoReportados,
      },
    };
  }

  /**
   * DNI verification with a persistent brute-force lock + portal-JWT emission
   * (Plan 03 `@Post(':token/verificar')`, PORTAL-01).
   *
   * Lock is the **block-duration model** (D-03): with only the two columns
   * `portalIntentosFallidos` + `portalBloqueadoHasta` (no per-attempt timestamp)
   * a true rolling window is impossible — instead 3 consecutive failures set a
   * single 15-min block, and a fresh 3 attempts are granted only once the block
   * has expired. The counter is reset to 0 ONLY when a prior block has just
   * expired (`portalBloqueadoHasta` is SET AND `< now`) — never on the `null`
   * case, otherwise attempts 1-2 would zero the counter and 429 would be dead code.
   */
  async verificar(rawToken: string, dni: string): Promise<string> {
    const paciente = await this.findByRawToken(rawToken);
    const now = Date.now();

    // (1) Active block → 429 immediately, before any DNI comparison (D-01/D-02).
    if (
      paciente.portalBloqueadoHasta &&
      paciente.portalBloqueadoHasta.getTime() > now
    ) {
      throw this.bloqueadoException(paciente.portalBloqueadoHasta);
    }

    // (2) No-DNI edge case: a blank stored DNI must NOT match a blank input (T-54-07).
    const dniStored = (paciente.dni ?? '')
      .trim()
      .replace(/\s/g, '')
      .replace(/\./g, '');
    if (dniStored === '') {
      throw new UnauthorizedException('DNI incorrecto');
    }

    // (3) Normalize input exactly as presupuestos.service (D-04).
    // WR-01: the public `verificar` body is unvalidated (no DTO/ValidationPipe),
    // so a non-string `dni` (e.g. `{ "dni": {} }`) would throw on `.trim()` and
    // surface as a 500. Treat any non-string as a wrong DNI (401), never a crash.
    if (typeof dni !== 'string') {
      throw new UnauthorizedException('DNI incorrecto');
    }
    const dniInput = dni.trim().replace(/\s/g, '').replace(/\./g, '');

    if (dniInput.toLowerCase() !== dniStored.toLowerCase()) {
      // (4) Mismatch. Reset the counter ONLY when a prior block has just expired.
      const blockExpired =
        !!paciente.portalBloqueadoHasta &&
        paciente.portalBloqueadoHasta.getTime() < now;
      const base = blockExpired ? 0 : paciente.portalIntentosFallidos;
      const nuevoIntentos = base + 1;

      if (nuevoIntentos >= PacientePortalService.MAX_INTENTOS) {
        const bloqueadoHasta = new Date(now + PacientePortalService.BLOQUEO_MS);
        await this.prisma.paciente.update({
          where: { id: paciente.id },
          data: {
            portalIntentosFallidos: nuevoIntentos,
            portalBloqueadoHasta: bloqueadoHasta,
          },
        });
        throw this.bloqueadoException(bloqueadoHasta);
      }

      await this.prisma.paciente.update({
        where: { id: paciente.id },
        data: {
          portalIntentosFallidos: nuevoIntentos,
          portalBloqueadoHasta: null,
        },
      });
      throw new UnauthorizedException('DNI incorrecto');
    }

    // (5) Match → reset counter, clear block, emit a short portal-scoped JWT (D-03/D-05).
    await this.prisma.paciente.update({
      where: { id: paciente.id },
      data: { portalIntentosFallidos: 0, portalBloqueadoHasta: null },
    });
    return this.jwt.sign(
      { sub: paciente.id, scope: 'portal-paciente' },
      { expiresIn: '45m' },
    );
  }

  /**
   * Confined contact write (Plan 03 JWT-guarded `@Patch`, PORTAL-03 backend, D-11).
   * The prisma `data` object is built from an explicit allow-list of contact keys,
   * so no identity / clinical / insurance / CRM field can ever be mass-assigned.
   */
  async updateContacto(pacienteId: string, dto: UpdateContactoPortalDto) {
    const data = this.pickPresent(dto, [
      'telefono',
      'telefonoAlternativo',
      'email',
      'direccion',
      'contactoEmergenciaNombre',
      'contactoEmergenciaTelefono',
      'contactoEmergenciaRelacion',
    ]);
    // CR-01: a bare `update` returns the FULL Paciente row by default (token
    // cifrado, curated clinical arrays, CRM columns) — the same data getDatos
    // deliberately hides. Mirror getDatos' safe contact subset so the 200 PATCH
    // response can never leak protected fields (SC#4, D-08/D-09).
    return this.prisma.paciente.update({
      where: { id: pacienteId },
      data,
      select: {
        telefono: true,
        telefonoAlternativo: true,
        email: true,
        direccion: true,
        contactoEmergenciaNombre: true,
        contactoEmergenciaTelefono: true,
        contactoEmergenciaRelacion: true,
      },
    });
  }

  /**
   * Confined staged-health write (Plan 03 JWT-guarded route, PORTAL-06, D-13).
   * The prisma `data` object contains ONLY the four `*AutoReportad*` staging keys.
   * Curated staff-only clinical arrays are never present here — a patient
   * self-report can never overwrite curated clinical data (T-54-06/SC#4).
   */
  async updateSaludStaged(pacienteId: string, dto: UpdateSaludStagedDto) {
    const data = this.pickPresent(dto, [
      'alergiasAutoReportadas',
      'antecedentesAutoReportados',
      'medicacionAutoReportada',
      'tratamientosPreviosAutoReportados',
    ]);
    // CR-01: scope the returned payload to the four staged keys only — a bare
    // `update` would echo back the curated clinical/CRM/token columns the portal
    // exists to protect (SC#4, D-08/D-09).
    return this.prisma.paciente.update({
      where: { id: pacienteId },
      data,
      select: {
        alergiasAutoReportadas: true,
        antecedentesAutoReportados: true,
        medicacionAutoReportada: true,
        tratamientosPreviosAutoReportados: true,
      },
    });
  }

  /**
   * Patient consult write (CHAT-04, T-55-01/T-55-02/T-55-05).
   *
   * Creates a `MensajeInterno` with `origenPaciente=true` and `autorId=null` so
   * the staff chat distinguishes it from staff messages. The `pacienteId` is
   * ALWAYS taken from the `pacienteId` argument (derived from the portal-scoped
   * JWT in the controller) — it is NEVER read from `dto` (D-03, pitfall 12).
   * `prioridad` is intentionally omitted so the schema default (MEDIA) applies.
   * No `MensajeLectura` auto-read record is created because the patient is not a
   * `Usuario` in the system (contrast with MensajesInternosService.create).
   * Returns only `{ id, createdAt }` — never the full Paciente row or clinical data.
   */
  async crearConsulta(
    pacienteId: string,
    dto: CreateConsultaPortalDto,
  ): Promise<{ id: string; createdAt: Date }> {
    // Defensive existence check — surfaces as 404 if the JWT references a deleted patient.
    const exists = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException();

    return this.prisma.mensajeInterno.create({
      data: {
        mensaje: dto.mensaje,
        pacienteId,
        origenPaciente: true,
        autorId: null,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });
  }

  /**
   * Consent resolver (CONS-03, D-09/D-10, T-56-09/T-56-10/T-56-11).
   *
   * Resolves the set of consent zonas the patient may sign from TWO sources,
   * deduplicated by zonaId (a zona reachable from both sources appears once):
   *   1. Pending surgeries (D-09 chain): Cirugia (PROGRAMADA/EN_CURSO) →
   *      cirugiaCatalogo → zona.
   *   2. The patient's current diagnosis/treatment: every zonaId referenced by a
   *      FINALIZED HistoriaClinica entry (new "zonas[]" contenido shape). This lets
   *      patients without a scheduled surgery still see the consents for the zonas
   *      under active clinical work. Legacy entries store zona NAMES (not ids) and
   *      cannot map to a ConsentimientoZonaArchivo, so they are skipped.
   *
   * Security invariants:
   * - `pacienteId` is ALWAYS from the portal-scoped JWT (method arg), NEVER from
   *   the request body or query params (T-56-09, pitfall 12).
   * - `pdfUrl` is built via StorageService.getPublicUrl and returned ONLY for
   *   PARA_FIRMAR zones belonging to the JWT patient (T-56-10).
   * - YA_FIRMADO derives from a ConsentimientoFirmado row scoped to
   *   pacienteId + zonaId — prevents issuing a second signable payload (T-56-11/D-08).
   *
   * Discriminated states (D-10):
   * - SIN_CIRUGIA   — nothing signable from EITHER source (no pending surgery and
   *                   no HC zonas resolvable to a consent).
   * - SIN_CATALOGO  — a pending cirugia exists but cirugiaCatalogoId is null (staff gap).
   * - SIN_ZONA      — a pending cirugia's catalog item has no zona linked (staff gap).
   * - SIN_PDF       — zona has no vigente ConsentimientoZonaArchivo (staff gap).
   * - YA_FIRMADO    — patient already signed for this zona+version; includes firmadoAt.
   * - PARA_FIRMAR   — happy path; includes pdfUrl (via StorageService), zonaId,
   *                   zonaNombre, consentimientoZonaArchivoId, version, indicacionesUrl.
   */
  async getConsentimientosParaFirmar(
    pacienteId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const result: Array<Record<string, unknown>> = [];

    // Per-surgery setup-gap signals (SIN_CATALOGO / SIN_ZONA) stay so staff can
    // see what to complete. Surgeries WITH a zona contribute to the signable
    // union computed by the shared helper below.
    const cirugias = await this.prisma.cirugia.findMany({
      where: {
        pacienteId,
        estado: { in: ['PROGRAMADA', 'EN_CURSO'] },
      },
      include: {
        cirugiaCatalogo: { select: { zonaId: true } },
      },
    });

    for (const cirugia of cirugias) {
      if (!cirugia.cirugiaCatalogo) {
        result.push({ estado: 'SIN_CATALOGO' });
        continue;
      }
      if (!cirugia.cirugiaCatalogo.zonaId) {
        result.push({ estado: 'SIN_ZONA' });
        continue;
      }
    }

    // Signable zona set = pending-surgery zonas ∪ current-HC zonas. This is the
    // SINGLE source of truth shared with firmarConsentimiento — the write path
    // validates dto.zonaId against exactly this set, so read and write can never
    // disagree about which zonas a patient may sign (dedup by zonaId, D-08).
    const zonaIdsAResolver = await this.resolverZonaIdsFirmables(pacienteId);

    // ── Classify each unique zona once (dedup across surgery + HC sources) ────
    if (zonaIdsAResolver.size > 0) {
      const zonas = await this.prisma.zonaHC.findMany({
        where: { id: { in: [...zonaIdsAResolver] } },
        include: {
          consentimientoArchivos: {
            where: { vigente: true },
            orderBy: { uploadedAt: 'desc' },
            take: 1,
          },
          // Scoped to this patient — any row = already signed (D-08/T-56-11).
          consentimientosFirmados: {
            where: { pacienteId },
            take: 1,
          },
        },
      });

      for (const zona of zonas) {
        // D-10 case 4: zona exists but no vigente consent PDF uploaded yet.
        if (zona.consentimientoArchivos.length === 0) {
          result.push({
            estado: 'SIN_PDF',
            zonaId: zona.id,
            zonaNombre: zona.nombre,
          });
          continue;
        }

        // D-10 case 5: patient already signed for this zona (D-08/T-56-11).
        if (zona.consentimientosFirmados.length > 0) {
          result.push({
            estado: 'YA_FIRMADO',
            zonaId: zona.id,
            zonaNombre: zona.nombre,
            firmadoAt: zona.consentimientosFirmados[0].firmadoAt,
          });
          continue;
        }

        // D-10 case 6 (happy path): signable payload with public PDF URL.
        // pdfUrl is built via StorageService — NEVER for other states (T-56-10).
        const archivo = zona.consentimientoArchivos[0];
        result.push({
          estado: 'PARA_FIRMAR',
          zonaId: zona.id,
          zonaNombre: zona.nombre,
          pdfUrl: this.storage.getPublicUrl(archivo.path),
          consentimientoZonaArchivoId: archivo.id,
          version: archivo.version,
          indicacionesUrl: zona.indicacionesUrl ?? null,
        });
      }
    }

    // D-10 case 1: nothing signable from either source.
    if (result.length === 0) {
      return [{ estado: 'SIN_CIRUGIA' }];
    }

    return result;
  }

  /**
   * Pure extractor: pulls ZonaHC ids out of a stored HC entry `contenido` JSON.
   * Only the new "zonas[]" shape carries a `zonaId` per zona; legacy/other shapes
   * (zona names only) yield nothing. Defensive against null/non-object contenido.
   */
  private extraerZonaIdsDeContenido(contenido: unknown): string[] {
    if (!contenido || typeof contenido !== 'object') return [];
    const zonas = (contenido as { zonas?: unknown }).zonas;
    if (!Array.isArray(zonas)) return [];
    const ids: string[] = [];
    for (const z of zonas) {
      if (
        z &&
        typeof z === 'object' &&
        typeof (z as { zonaId?: unknown }).zonaId === 'string'
      ) {
        ids.push((z as { zonaId: string }).zonaId);
      }
    }
    return ids;
  }

  /**
   * SINGLE source of truth for "which zonas may this patient sign a consent for".
   * Union (deduped by zonaId) of:
   *   - zonas of the patient's pending (PROGRAMADA/EN_CURSO) surgeries, and
   *   - zonas referenced by the patient's FINALIZED HC entries (new zonas[] shape).
   *
   * Both `getConsentimientosParaFirmar` (read) and `firmarConsentimiento` (write)
   * call this so the set of offered zonas and the set of accepted zonas are
   * identical — a patient can only ever sign a zona the read path would surface,
   * and a signable HC zona is never rejected at write time (pitfall E, T-56-12).
   */
  private async resolverZonaIdsFirmables(
    pacienteId: string,
  ): Promise<Set<string>> {
    const zonaIds = new Set<string>();

    const cirugias = await this.prisma.cirugia.findMany({
      where: { pacienteId, estado: { in: ['PROGRAMADA', 'EN_CURSO'] } },
      include: { cirugiaCatalogo: { select: { zonaId: true } } },
    });
    for (const cirugia of cirugias) {
      if (cirugia.cirugiaCatalogo?.zonaId) {
        zonaIds.add(cirugia.cirugiaCatalogo.zonaId);
      }
    }

    const historias = await this.prisma.historiaClinica.findMany({
      where: { pacienteId },
      select: {
        entradas: {
          where: { status: 'FINALIZED' },
          select: { contenido: true },
        },
      },
    });
    for (const historia of historias) {
      for (const entrada of historia.entradas) {
        for (const zonaId of this.extraerZonaIdsDeContenido(entrada.contenido)) {
          zonaIds.add(zonaId);
        }
      }
    }

    return zonaIds;
  }

  /**
   * Consent signing orchestration (CONS-04/05/06/07, D-06/07/08/11).
   *
   * Full pipeline: validate zona ownership → block re-signing (D-08) → confirm
   * indicacionesLeidas (D-11) → strip + validate PNG → stamp PDF (ConsentStampService)
   * → archive immutably (StorageService) → create forensic record → set aggregate flag.
   *
   * Security invariants:
   * - `pacienteId` is ALWAYS from the portal-scoped JWT (method arg), NEVER from dto
   *   (T-56-12, pitfall 12).
   * - `dto.zonaId` is re-validated against the patient's pending cirugia chain so a
   *   patient cannot sign a zone they are not associated with (pitfall E, T-56-12).
   * - `ip` and `userAgent` are captured server-side in the controller from request
   *   headers — never from `dto` (T-56-13).
   * - Re-signing is blocked by a `ConflictException` (409) when a `ConsentimientoFirmado`
   *   row already exists for `pacienteId + zonaId` (D-08, T-56-14).
   * - PNG bytes are magic-byte + size validated before being passed to pdf-lib (T-56-15).
   * - Returns only `{ ok: true }` — the signed PDF URL is NOT returned to the portal
   *   (T-56-10 / UI-SPEC post-sign state).
   */
  async firmarConsentimiento(
    pacienteId: string,
    dto: FirmarConsentimientoPortalDto,
    ip: string,
    userAgent: string,
  ): Promise<{ ok: true }> {
    // (1) Validate dto.zonaId belongs to THIS patient's signable set — the union
    // of pending-surgery zonas AND current-HC zonas (pitfall E, T-56-12). The set
    // is computed by the SAME helper the read path uses, so the write path can
    // never accept a zona the read path would not have offered (and vice-versa).
    // A patient without a scheduled surgery can now sign an HC-derived consent.
    const zonaIdsFirmables = await this.resolverZonaIdsFirmables(pacienteId);
    if (!zonaIdsFirmables.has(dto.zonaId)) {
      throw new NotFoundException(
        'Zona de consentimiento no encontrada para esta paciente',
      );
    }

    const zona = await this.prisma.zonaHC.findUnique({
      where: { id: dto.zonaId },
      include: {
        consentimientoArchivos: {
          where: { vigente: true },
          orderBy: { uploadedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!zona || zona.consentimientoArchivos.length === 0) {
      throw new NotFoundException('No hay consentimiento vigente para esta zona');
    }

    const archivo = zona.consentimientoArchivos[0];

    // (2) D-08 guard: block re-signing (409, T-56-14, no re-sign).
    const existingSignature = await this.prisma.consentimientoFirmado.findFirst({
      where: { pacienteId, zonaId: dto.zonaId },
    });
    if (existingSignature) {
      throw new ConflictException(
        'El consentimiento para esta zona ya fue firmado.',
      );
    }

    // (3) D-11: indicacionesLeidas must be true before signing is allowed.
    if (!dto.indicacionesLeidas) {
      throw new BadRequestException(
        'Debe confirmar que ha leído las indicaciones antes de firmar.',
      );
    }

    // (4) Strip data URL prefix server-side (T-56-15 — never trust client to strip).
    const b64 = dto.signaturePngDataUrl.split(',')[1];
    if (!b64) throw new BadRequestException('Firma inválida');
    const pngBuffer = Buffer.from(b64, 'base64');

    // Size guard — raw PNG from canvas ~50-200KB; 1MB is a generous upper bound (T-56-15/T-56-16).
    if (pngBuffer.length > 1_000_000) {
      throw new BadRequestException('Imagen de firma demasiado grande');
    }

    // (5) Read template PDF from disk + stamp (PNG magic-byte validation inside ConsentStampService).
    const templateBuffer = await this.storage.readFile(archivo.path);
    const { pdfBuffer, hashSha256 } = await this.stamp.stampConsentimiento({
      templateBuffer,
      signaturePngBuffer: pngBuffer,
      metadata: {
        fechaUtc: new Date().toISOString(),
        ip,
        userAgent,
        version: archivo.version,
      },
    });

    // (6) Archive signed PDF immutably via StorageService (T-56-14 — no overwrite/delete path).
    const signedPath = await this.storage.save(pdfBuffer, archivo.profesionalId);

    // (7) Create forensic record with all 10 required fields (D-06, CONS-07).
    // firmadoAt defaults to now() via the Prisma schema @default(now()).
    await this.prisma.consentimientoFirmado.create({
      data: {
        pacienteId,
        zonaId: dto.zonaId,
        consentimientoZonaArchivoId: archivo.id,
        pdfFirmadoPath: signedPath,
        ip,
        userAgent,
        versionNumero: archivo.version,
        hashSha256,
        indicacionesLeidasAt: new Date(),
      },
    });

    // (8) Set Paciente aggregate flag once ≥ 1 ConsentimientoFirmado row exists (D-07, CONS-08).
    await this.prisma.paciente.update({
      where: { id: pacienteId },
      data: {
        consentimientoFirmado: true,
        consentimientoFirmadoAt: new Date(),
      },
    });

    // D-10 / UI-SPEC: do NOT return the signed PDF URL — portal shows static confirmation (T-56-10).
    return { ok: true };
  }

  /**
   * Defense in depth: build a prisma `data` object from ONLY the allow-listed
   * keys that are actually present (not `undefined`) on the input — extra keys
   * passed at runtime are dropped even if the per-route ValidationPipe is absent.
   */
  private pickPresent<T extends object>(
    input: T,
    allowed: readonly string[],
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      const value = (input as Record<string, unknown>)[key];
      // WR-02: `@IsOptional()` lets an explicit `null` pass DTO validation, but
      // forwarding `null` into a non-nullable column (e.g. `telefono`) throws at
      // the DB layer (500). Treat `null` like an absent field — no change.
      if (value !== undefined && value !== null) data[key] = value;
    }
    return data;
  }

  /** 429 response for an active brute-force block (D). */
  private bloqueadoException(bloqueadoHasta: Date): HttpException {
    const retryAfter = Math.max(
      0,
      Math.ceil((bloqueadoHasta.getTime() - Date.now()) / 1000),
    );
    return new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message:
          'Demasiados intentos fallidos. Volvé a intentar en unos minutos.',
        bloqueadoHasta,
        retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

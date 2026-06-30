import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

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
  async preVerify(rawToken: string): Promise<{ existe: true; bloqueado: boolean }> {
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
        ? { fecha: proximaCirugia.fecha, procedimiento: proximaCirugia.procedimiento }
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
        tratamientosPreviosAutoReportados: paciente.tratamientosPreviosAutoReportados,
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

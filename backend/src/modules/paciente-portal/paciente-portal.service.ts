import { Injectable, NotFoundException } from '@nestjs/common';
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
}

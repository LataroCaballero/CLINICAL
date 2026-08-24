import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { PacientePortalService } from './paciente-portal.service';
import { PortalJwtGuard } from './guards/portal-jwt.guard';
import { UpdateContactoPortalDto } from './dto/update-contacto-portal.dto';
import { UpdateSaludStagedDto } from './dto/update-salud-staged.dto';
import { CreateConsultaPortalDto } from './dto/create-consulta-portal.dto';
import { FirmarConsentimientoPortalDto } from './dto/firmar-consentimiento-portal.dto';

/** Shape the portal-jwt strategy attaches to `req.user` (scope from JWT, never body). */
type PortalRequest = Request & { user: { pacienteId: string } };

/**
 * Patient-portal HTTP surface.
 *
 * Two route tiers live here:
 * - PUBLIC (this set): pre-verification + DNI verification. NO `@UseGuards` at
 *   class level, so these stay reachable without a portal JWT. A strict
 *   class-level throttle tier (20 req/min, lower than the global 100/60s
 *   APP_GUARD) blunts token enumeration / DNI brute force (PORTAL-01, T-54-09).
 * - AUTHENTICATED (added in Task 2): read + writes, each guarded per-route with
 *   `@UseGuards(PortalJwtGuard)`. The guard is NEVER applied at class level so
 *   the two public routes below remain public.
 *
 * Route mapping (D-07/D-08/D-10):
 * - `@Get(':token')`            → pre-verification, returns 200/404 only, no patient data (D-07).
 * - `@Post(':token/verificar')` → DNI verify, returns the portal JWT or lets the
 *                                  service's 429 (blocked) / 401 (wrong DNI) propagate (D-05).
 */
@Throttle({ default: { ttl: 60000, limit: 20 } })
@Controller('paciente-portal/public')
export class PacientePortalController {
  constructor(private readonly service: PacientePortalService) {}

  /**
   * Consent resolver (CONS-03, D-09/D-10, T-56-09).
   *
   * Returns a per-zone array of discriminated status items so the frontend can
   * render the correct consent UI without client-side inference.
   *
   * ROUTE ORDER: this static `consentimiento` route MUST be declared before the
   * `@Get(':token')` param route below — Express matches in declaration order, so
   * if `:token` came first it would capture `GET .../consentimiento` as
   * `token="consentimiento"` and 404 in preVerify (route-shadowing bug).
   *
   * Security: `pacienteId` comes exclusively from the portal-scoped JWT
   * (`req.user`) — it is NEVER read from @Param, @Body or @Query (T-56-09,
   * pitfall 12). `@UseGuards(PortalJwtGuard)` is per-route so the public
   * preVerify/verificar routes stay reachable (no class-level guard).
   */
  @UseGuards(PortalJwtGuard)
  @Get('consentimiento')
  getConsentimiento(@Req() req: PortalRequest) {
    return this.service.getConsentimientosParaFirmar(req.user.pacienteId);
  }

  /**
   * Public pre-verification (D-07). Returns existence (200) + a `bloqueado` flag
   * only; an unknown token surfaces as 404. No patient data is ever returned here.
   */
  @Get(':token')
  preVerify(@Param('token') token: string) {
    return this.service.preVerify(token);
  }

  /**
   * Public DNI verification (D-05). On success returns the portal-scoped JWT; the
   * service throws 429 (active brute-force block) or 401 (wrong DNI), which
   * propagate unchanged.
   */
  @Post(':token/verificar')
  verificar(@Param('token') token: string, @Body() body: { dni: string }) {
    return this.service.verificar(token, body.dni);
  }

  /**
   * Authenticated read (D-08/D-09). `pacienteId` comes from the verified portal
   * JWT (`req.user`), NEVER from the URL or body (pitfall 12, T-54-11). Returns
   * editable contact + read-only context + staged `*AutoReportad*` values.
   */
  @UseGuards(PortalJwtGuard)
  @Get()
  getDatos(@Req() req: PortalRequest) {
    return this.service.getDatos(req.user.pacienteId);
  }

  /**
   * Confined contact update (PORTAL-04, D-11/D-12). The explicit per-route
   * `new ValidationPipe({ whitelist: true })` is the load-bearing SC#3 guard —
   * there is NO global ValidationPipe in this project, so without it the narrow
   * DTO would be decorative. Whitelist-only (the reject-on-extra option is
   * deliberately omitted): prohibited fields (alergias / etapaCRM / dni /
   * obraSocialId ...) are SILENTLY stripped, the request still returns 200 (D-12).
   */
  @UseGuards(PortalJwtGuard)
  @Patch('datos-personales')
  updateContacto(
    @Req() req: PortalRequest,
    @Body(new ValidationPipe({ whitelist: true }))
    dto: UpdateContactoPortalDto,
  ) {
    return this.service.updateContacto(req.user.pacienteId, dto);
  }

  /**
   * Confined staged-health write (PORTAL-06, D-13). Same explicit per-route
   * `new ValidationPipe({ whitelist: true })` (whitelist-only, reject-on-extra
   * omitted) — only the four `*AutoReportad*` staging keys survive; any clinical field
   * injected in the body is silently dropped (200), never written (SC#3/SC#4).
   */
  @UseGuards(PortalJwtGuard)
  @Patch('salud')
  updateSaludStaged(
    @Req() req: PortalRequest,
    @Body(new ValidationPipe({ whitelist: true }))
    dto: UpdateSaludStagedDto,
  ) {
    return this.service.updateSaludStaged(req.user.pacienteId, dto);
  }

  /**
   * Patient consult write (CHAT-04, T-55-01/T-55-02/T-55-03).
   *
   * `pacienteId` comes from the portal-scoped JWT (`req.user`), NEVER from the
   * URL or request body (D-03, pitfall 12, T-55-01).
   *
   * `new ValidationPipe({ whitelist: true })` per-route is the load-bearing
   * SC#3 guard for mass-assignment (T-55-02). There is NO global ValidationPipe
   * in this project — without the per-route pipe the narrow DTO would be
   * decorative. `forbidNonWhitelisted` is intentionally omitted: extra fields
   * (autorId, prioridad, pacienteId) are silently discarded, not rejected (D-12).
   *
   * `@UseGuards(PortalJwtGuard)` is per-route (T-55-03) — it is NEVER applied
   * at class level so the public `preVerify` and `verificar` routes remain reachable.
   */
  @UseGuards(PortalJwtGuard)
  @Post('consulta')
  enviarConsulta(
    @Req() req: PortalRequest,
    @Body(new ValidationPipe({ whitelist: true }))
    dto: CreateConsultaPortalDto,
  ) {
    return this.service.crearConsulta(req.user.pacienteId, dto);
  }

  /**
   * Indicaciones read-receipt endpoint (INDIC-03, D-06/D-07, T-61-04/05/07).
   *
   * Records the acuse de lectura on the patient profile
   * (`Paciente.indicacionesLeidasAt`), fully decoupled from consent signing
   * (CONS-11). Set-once idempotent — see `registrarAcuseIndicaciones` for the
   * write semantics.
   *
   * Security invariants:
   * - `pacienteId` comes ONLY from the portal-scoped JWT (`req.user`) — NEVER
   *   from @Param or @Body (T-61-04).
   * - No request body/DTO (D-07) — nothing to validate or whitelist.
   * - `@UseGuards(PortalJwtGuard)` is per-route so the public preVerify/verificar
   *   routes remain unrestricted (no class-level guard, T-61-07).
   */
  @UseGuards(PortalJwtGuard)
  @Post('indicaciones/acuse')
  registrarAcuseIndicaciones(@Req() req: PortalRequest) {
    return this.service.registrarAcuseIndicaciones(req.user.pacienteId);
  }

  /**
   * Consent signing endpoint (CONS-04/05/06/07, D-06/07/08/12, T-56-12/13/14/15).
   *
   * Stamps the patient's drawn signature onto the template PDF, archives it
   * immutably, and records the full forensic audit trail.
   *
   * Security invariants:
   * - `pacienteId` comes ONLY from the portal-scoped JWT (`req.user`) — NEVER from
   *   @Body or @Param (D-12, pitfall 12, T-56-12).
   * - `ip` is captured from `x-forwarded-for` header (first hop) or `req.socket` as
   *   server-side fallback — NEVER from the request body (T-56-13).
   * - `userAgent` is captured from the `user-agent` header — NEVER from body (T-56-13).
   * - `new ValidationPipe({ whitelist: true })` per-route is the load-bearing SC#3
   *   mass-assignment guard; there is NO global ValidationPipe in this project.
   * - `@UseGuards(PortalJwtGuard)` is per-route so the public preVerify/verificar
   *   routes remain unrestricted (no class-level guard).
   */
  @UseGuards(PortalJwtGuard)
  @Post('consentimiento/firmar')
  firmarConsentimiento(
    @Req() req: PortalRequest,
    @Body(new ValidationPipe({ whitelist: true }))
    dto: FirmarConsentimientoPortalDto,
  ) {
    // IP: prefer x-forwarded-for (first hop) over socket.remoteAddress (T-56-13).
    // Never read from body — server-side capture only.
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket?.remoteAddress ??
      'unknown';
    const userAgent = (req.headers['user-agent'] as string) ?? 'unknown';
    return this.service.firmarConsentimiento(
      req.user.pacienteId,
      dto,
      ip,
      userAgent,
    );
  }
}

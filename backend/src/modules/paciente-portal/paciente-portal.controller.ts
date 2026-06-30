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
}

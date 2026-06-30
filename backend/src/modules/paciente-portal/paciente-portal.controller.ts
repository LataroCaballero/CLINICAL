import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PacientePortalService } from './paciente-portal.service';

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
}

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard for authenticated portal routes. Wraps the named `'portal-jwt'` strategy
 * (NOT the staff `'jwt'` one), so only a portal-scoped token can pass (T-54-01).
 * Apply per-route via `@UseGuards(PortalJwtGuard)`; the public `:token` /
 * `:token/verificar` routes stay unguarded.
 */
@Injectable()
export class PortalJwtGuard extends AuthGuard('portal-jwt') {}

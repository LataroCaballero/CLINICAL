import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Portal-scoped JWT strategy (D-05).
 *
 * Registered under the NAMED key `'portal-jwt'` (second PassportStrategy arg) so
 * it never collides with the staff `'jwt'` strategy — a staff-issued token can
 * therefore never satisfy a portal route (threat T-54-01: staff-token reuse).
 *
 * `ignoreExpiration: false` means an expired portal JWT yields 401, forcing a DNI
 * re-verify (D-06) — there is no refresh token for the portal.
 *
 * `validate()` first rejects any payload whose scope is not `portal-paciente`
 * (returns null → 401), then resolves the Paciente by `payload.sub`. The handler
 * reads `req.user.pacienteId` — scope is derived from the authenticated JWT, never
 * from the request body (pitfall 12).
 */
@Injectable()
export class PortalJwtStrategy extends PassportStrategy(
  Strategy,
  'portal-jwt',
) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    if (payload?.scope !== 'portal-paciente') {
      return null;
    }

    const paciente = await this.prisma.paciente.findUnique({
      where: { id: payload.sub },
      select: { id: true },
    });

    if (!paciente) {
      return null;
    }

    return { pacienteId: paciente.id };
  }
}

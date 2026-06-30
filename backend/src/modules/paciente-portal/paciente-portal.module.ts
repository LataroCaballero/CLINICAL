import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PacientePortalController } from './paciente-portal.controller';
import { PacientePortalService } from './paciente-portal.service';
import { PortalJwtStrategy } from './strategies/portal-jwt.strategy';
import { PortalJwtGuard } from './guards/portal-jwt.guard';

/**
 * Patient-portal module.
 *
 * Registers its OWN `JwtModule` + `PassportModule`: AuthModule is @Global but
 * exports only its guards + AuthService (NOT JwtService / JwtModule), so the
 * portal service's `JwtService` dependency is not injectable unless this module
 * registers JwtModule itself (mirrors auth.module.ts:13-18). The portal-JWT
 * lifetime (`expiresIn`) is set per-sign in the service (`45m`), not here.
 *
 * PrismaService is global (PrismaModule @Global) — no import needed. The global
 * ThrottlerGuard (APP_GUARD in app.module.ts) already covers the new public
 * routes, with the controller's class-level @Throttle tightening the tier.
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.register({ secret: process.env.JWT_SECRET }),
  ],
  controllers: [PacientePortalController],
  providers: [PacientePortalService, PortalJwtStrategy, PortalJwtGuard],
})
export class PacientePortalModule {}

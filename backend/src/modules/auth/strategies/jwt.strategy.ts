import { PrismaService } from '@/src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const baseUser = {
      userId: payload.sub,
      rol: payload.rol,
      profesionalId: null,
    };

    if (payload.rol === 'PROFESIONAL') {
      const profesional = await this.prisma.profesional.findUnique({
        where: { usuarioId: payload.sub },
        select: { id: true },
      });

      baseUser.profesionalId = profesional?.id ?? null;
    }

    return baseUser;
  }
}

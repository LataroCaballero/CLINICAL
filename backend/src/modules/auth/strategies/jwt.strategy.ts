import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { RolUsuario } from '@prisma/client';

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
    let profesionalId: string | null = null;

    if (payload.rol === RolUsuario.PROFESIONAL) {
      const profesional = await this.prisma.profesional.findUnique({
        where: { usuarioId: payload.sub },
        select: { id: true },
      });

      profesionalId = profesional?.id ?? null;
    }

    return {
      userId: payload.sub,
      rol: payload.rol,
      profesionalId,
    };
  }
}
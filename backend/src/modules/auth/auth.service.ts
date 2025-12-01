import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private generateRefreshToken(): string {
    return randomBytes(48).toString('hex');
  }

  async login(dto: LoginDto, req: any) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    // (1) Crear refresh token
    const refreshToken = this.generateRefreshToken();

    // (2) Fecha de expiración (30 días)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // (3) Crear sesión en BD
    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
        device: req.headers['x-device'] || null,
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    // (4) Generar access token
    const accessToken = this.jwt.sign({
      sub: user.id,
      rol: user.rol,
    });

    // (5) Retornar sesión completa
    return {
      accessToken,
      refreshToken,
      sessionId: session.id,
      expiresAt: session.expiresAt,
    };
  }
  async register(dto: RegisterDto) {
    const exists = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (exists) throw new UnauthorizedException('El email ya está registrado');

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        apellido: dto.apellido,
        email: dto.email,
        passwordHash: hashed,
        rol: dto.rol,
      },
    });

    // Generar tokens iniciales
    const refreshToken = this.generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
        device: null,
        ipAddress: null,
        userAgent: null,
      },
    });

    const accessToken = this.jwt.sign({
      sub: user.id,
      rol: user.rol,
    });

    return {
      accessToken,
      refreshToken,
      sessionId: session.id,
      expiresAt: session.expiresAt,
    };
  }
  async refresh(dto: RefreshDto, req: any) {
    const session = await this.prisma.authSession.findUnique({
      where: { id: dto.sessionId },
    });

    if (!session) throw new UnauthorizedException('Sesión inválida');

    if (session.revoked) throw new UnauthorizedException('Sesión revocada');

    if (session.refreshToken !== dto.refreshToken) {
      // Marcar sesión como comprometida
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: {
          revoked: true,
          revokedAt: new Date(),
        },
      });

      throw new UnauthorizedException('Actividad sospechosa: sesión revocada');
    }

    // verificar expiración
    if (session.expiresAt < new Date())
      throw new UnauthorizedException('Refresh token expirado');

    // verificar inactividad (más de 30 días)
    const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;

    if (Date.now() - session.lastUsedAt.getTime() > THIRTY_DAYS) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { revoked: true, revokedAt: new Date() },
      });

      throw new UnauthorizedException('Sesión expirada por inactividad');
    }

    // Detección de anomalías: cambio brusco de IP
    const currentIp = req.ip || null;

    if (session.ipAddress && session.ipAddress !== currentIp) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: {
          revoked: true,
          revokedAt: new Date(),
        },
      });

      throw new UnauthorizedException(
        'IP inconsistente: sesión revocada por seguridad',
      );
    }

    const incomingUA = req.headers['user-agent'];

    // si el user-agent cambia radicalmente, revocar
    if (session.userAgent && session.userAgent !== incomingUA) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: {
          revoked: true,
          revokedAt: new Date(),
        },
      });

      throw new UnauthorizedException(
        'User-Agent inconsistente: sesión revocada por seguridad',
      );
    }

    // Anti-flood: limitar a 1 refresh cada 3 segundos
    const THREE_SECONDS = 3000;

    if (Date.now() - session.lastUsedAt.getTime() < THREE_SECONDS) {
      throw new UnauthorizedException(
        'Solicitudes muy frecuentes. Espere antes de intentar nuevamente.',
      );
    }

    // ROTACIÓN - nivel Google
    const newRefreshToken = this.generateRefreshToken();

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);

    // actualizar sesión existente
    await this.prisma.authSession.update({
      where: { id: dto.sessionId },
      data: {
        refreshToken: newRefreshToken,
        expiresAt: newExpiresAt,
        lastUsedAt: new Date(),
      },
    });

    // generar nuevo access token
    const user = await this.prisma.usuario.findUnique({
      where: { id: session.userId },
    });

    const accessToken = this.jwt.sign({
      sub: user.id,
      rol: user.rol,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      sessionId: session.id,
      expiresAt: newExpiresAt,
    };
  }
  async logout(dto: LogoutDto) {
    const session = await this.prisma.authSession.findUnique({
      where: { id: dto.sessionId },
    });

    if (!session) throw new UnauthorizedException('Sesión inválida');

    if (session.revoked) return { message: 'Sesión ya cerrada' };

    await this.prisma.authSession.update({
      where: { id: dto.sessionId },
      data: {
        revoked: true,
        revokedAt: new Date(),
        refreshToken: 'REVOKED_' + session.refreshToken, // evita reuso
      },
    });

    return { message: 'Sesión cerrada correctamente' };
  }
  async logoutAll(dto: LogoutDto) {
    const session = await this.prisma.authSession.findUnique({
      where: { id: dto.sessionId },
    });

    if (!session) throw new UnauthorizedException('Sesión inválida');

    await this.prisma.authSession.updateMany({
      where: { userId: session.userId },
      data: {
        revoked: true,
        revokedAt: new Date(),
        refreshToken: null,
      },
    });

    return { message: 'Todas las sesiones cerradas correctamente' };
  }
}

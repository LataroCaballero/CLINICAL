"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const bcrypt = require("bcrypt");
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
let AuthService = class AuthService {
    constructor(prisma, jwt) {
        this.prisma = prisma;
        this.jwt = jwt;
    }
    generateRefreshToken() {
        return (0, crypto_1.randomBytes)(48).toString('hex');
    }
    async login(dto, req) {
        const user = await this.prisma.usuario.findUnique({
            where: { email: dto.email },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        const refreshToken = this.generateRefreshToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
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
    async register(dto) {
        const exists = await this.prisma.usuario.findUnique({
            where: { email: dto.email },
        });
        if (exists)
            throw new common_1.UnauthorizedException('El email ya está registrado');
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
    async refresh(dto, req) {
        const session = await this.prisma.authSession.findUnique({
            where: { id: dto.sessionId },
        });
        if (!session)
            throw new common_1.UnauthorizedException('Sesión inválida');
        if (session.revoked)
            throw new common_1.UnauthorizedException('Sesión revocada');
        if (session.refreshToken !== dto.refreshToken) {
            await this.prisma.authSession.update({
                where: { id: session.id },
                data: {
                    revoked: true,
                    revokedAt: new Date(),
                },
            });
            throw new common_1.UnauthorizedException('Actividad sospechosa: sesión revocada');
        }
        if (session.expiresAt < new Date())
            throw new common_1.UnauthorizedException('Refresh token expirado');
        const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;
        if (Date.now() - session.lastUsedAt.getTime() > THIRTY_DAYS) {
            await this.prisma.authSession.update({
                where: { id: session.id },
                data: { revoked: true, revokedAt: new Date() },
            });
            throw new common_1.UnauthorizedException('Sesión expirada por inactividad');
        }
        const currentIp = req.ip || null;
        if (session.ipAddress && session.ipAddress !== currentIp) {
            await this.prisma.authSession.update({
                where: { id: session.id },
                data: {
                    revoked: true,
                    revokedAt: new Date(),
                },
            });
            throw new common_1.UnauthorizedException('IP inconsistente: sesión revocada por seguridad');
        }
        const incomingUA = req.headers['user-agent'];
        if (session.userAgent && session.userAgent !== incomingUA) {
            await this.prisma.authSession.update({
                where: { id: session.id },
                data: {
                    revoked: true,
                    revokedAt: new Date(),
                },
            });
            throw new common_1.UnauthorizedException('User-Agent inconsistente: sesión revocada por seguridad');
        }
        const THREE_SECONDS = 3000;
        if (Date.now() - session.lastUsedAt.getTime() < THREE_SECONDS) {
            throw new common_1.UnauthorizedException('Solicitudes muy frecuentes. Espere antes de intentar nuevamente.');
        }
        const newRefreshToken = this.generateRefreshToken();
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 30);
        await this.prisma.authSession.update({
            where: { id: dto.sessionId },
            data: {
                refreshToken: newRefreshToken,
                expiresAt: newExpiresAt,
                lastUsedAt: new Date(),
            },
        });
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
    async logout(dto) {
        const session = await this.prisma.authSession.findUnique({
            where: { id: dto.sessionId },
        });
        if (!session)
            throw new common_1.UnauthorizedException('Sesión inválida');
        if (session.revoked)
            return { message: 'Sesión ya cerrada' };
        await this.prisma.authSession.update({
            where: { id: dto.sessionId },
            data: {
                revoked: true,
                revokedAt: new Date(),
                refreshToken: 'REVOKED_' + session.refreshToken,
            },
        });
        return { message: 'Sesión cerrada correctamente' };
    }
    async logoutAll(dto) {
        const session = await this.prisma.authSession.findUnique({
            where: { id: dto.sessionId },
        });
        if (!session)
            throw new common_1.UnauthorizedException('Sesión inválida');
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
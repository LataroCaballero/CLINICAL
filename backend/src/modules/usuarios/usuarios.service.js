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
exports.UsuariosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const bcrypt = require("bcrypt");
let UsuariosService = class UsuariosService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.usuario.findMany({
            select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
                rol: true,
                telefono: true,
                createdAt: true,
            },
        });
    }
    async findOne(id) {
        const user = await this.prisma.usuario.findUnique({
            where: { id },
            select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
                rol: true,
                telefono: true,
                createdAt: true,
            },
        });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        return user;
    }
    async create(dto) {
        const passwordHash = await bcrypt.hash(dto.password, 10);
        return this.prisma.usuario.create({
            data: {
                nombre: dto.nombre,
                apellido: dto.apellido,
                email: dto.email,
                telefono: dto.telefono,
                rol: dto.rol,
                passwordHash,
            },
            select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
                rol: true,
                telefono: true,
            },
        });
    }
    async update(id, dto) {
        const data = { ...dto };
        if (dto.password) {
            data.passwordHash = await bcrypt.hash(dto.password, 10);
            delete data.password;
        }
        return this.prisma.usuario.update({
            where: { id },
            data,
            select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
                rol: true,
                telefono: true,
            },
        });
    }
    async remove(id) {
        await this.prisma.usuario.delete({
            where: { id },
        });
        return { message: 'Usuario eliminado' };
    }
};
exports.UsuariosService = UsuariosService;
exports.UsuariosService = UsuariosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsuariosService);
//# sourceMappingURL=usuarios.service.js.map
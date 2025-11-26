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
exports.PacientesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let PacientesService = class PacientesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(dto) {
        return this.prisma.paciente.create({ data: dto });
    }
    async update(id, dto) {
        await this.ensureExists(id);
        return this.prisma.paciente.update({
            where: { id },
            data: dto,
        });
    }
    async delete(id) {
        await this.ensureExists(id);
        return this.prisma.paciente.delete({ where: { id } });
    }
    async findOne(id) {
        const paciente = await this.prisma.paciente.findUnique({ where: { id } });
        if (!paciente)
            throw new common_1.NotFoundException('Paciente no encontrado');
        return paciente;
    }
    async search(query) {
        const { q, dni, telefono, nombre } = query;
        if (q) {
            const results = await this.prisma.$queryRaw `
        SELECT
          p.*,
          (
            -- Coincidencia exacta nombre
            CASE WHEN LOWER(p."nombreCompleto") = LOWER(${q}) THEN 1.0 ELSE 0 END +

            -- Contiene en nombre (ILIKE)
            CASE WHEN p."nombreCompleto" ILIKE '%' || ${q} || '%' THEN 0.6 ELSE 0 END +

            -- Similaridad fonética en nombre
            (similarity(p."nombreCompleto", ${q}) * 0.7) +

            -- Coincidencia exacta DNI
            CASE WHEN p."dni" = ${q} THEN 0.95 ELSE 0 END +

            -- DNI que empieza igual
            CASE WHEN p."dni" LIKE ${q} || '%' THEN 0.7 ELSE 0 END +

            -- Teléfono contiene
            CASE WHEN p."telefono" LIKE '%' || ${q} || '%' THEN 0.5 ELSE 0 END
          ) AS score
        FROM "Paciente" p
        WHERE
          -- Filtro mínimo de relevancia para no traer basura
          (
            similarity(p."nombreCompleto", ${q}) > 0.2
            OR p."nombreCompleto" ILIKE '%' || ${q} || '%'
            OR p."dni" LIKE ${q} || '%'
            OR p."telefono" LIKE '%' || ${q} || '%'
          )
        ORDER BY score DESC, p."nombreCompleto" ASC
        LIMIT 30;
      `;
            return results;
        }
        return this.prisma.paciente.findMany({
            where: {
                nombreCompleto: nombre
                    ? { contains: nombre, mode: 'insensitive' }
                    : undefined,
                dni: dni ? { contains: dni } : undefined,
                telefono: telefono ? { contains: telefono } : undefined,
            },
            orderBy: { nombreCompleto: 'asc' },
        });
    }
    async ensureExists(id) {
        const exists = await this.prisma.paciente.findUnique({ where: { id } });
        if (!exists)
            throw new common_1.NotFoundException('Paciente no encontrado');
    }
    async suggest(q) {
        if (!q || q.trim().length < 2)
            return [];
        const query = q.trim();
        try {
            const results = await this.prisma.$queryRaw `
      SELECT
        p.id,
        p."nombreCompleto",
        p.dni,
        p.telefono,
        p."fotoUrl",
        (
          CASE 
            WHEN LOWER(unaccent(p."nombreCompleto")) = LOWER(unaccent(${query})) 
              THEN 1.0 ELSE 0 
          END +
          CASE 
            WHEN unaccent(p."nombreCompleto") ILIKE '%' || unaccent(${query}) || '%' 
              THEN 0.6 ELSE 0 
          END +
          (similarity(unaccent(p."nombreCompleto"), unaccent(${query})) * 0.7) +
          CASE WHEN p.dni = ${query} THEN 0.95 ELSE 0 END +
          CASE WHEN p.dni LIKE ${query} || '%' THEN 0.7 ELSE 0 END +
          CASE WHEN p.telefono LIKE '%' || ${query} || '%' THEN 0.5 ELSE 0 END
        ) AS score
      FROM "Paciente" p
      WHERE
        similarity(unaccent(p."nombreCompleto"), unaccent(${query})) > 0.25
        OR unaccent(p."nombreCompleto") ILIKE '%' || unaccent(${query}) || '%'
        OR p.dni LIKE ${query} || '%'
        OR p.telefono LIKE '%' || ${query} || '%'
      ORDER BY score DESC
      LIMIT 10;
    `;
            return results ?? [];
        }
        catch (err) {
            console.error('❌ ERROR EN SUGGEST:', err);
            return [];
        }
    }
};
exports.PacientesService = PacientesService;
exports.PacientesService = PacientesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PacientesService);
//# sourceMappingURL=pacientes.service.js.map
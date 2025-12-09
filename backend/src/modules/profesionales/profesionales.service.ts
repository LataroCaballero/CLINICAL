import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProfesionalesService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.profesional.findMany({
            select: {
                id: true,
                especialidad: true,
                usuario: {
                    select: {
                        nombre: true,
                        apellido: true,
                    },
                },
            },
        });
    }
}

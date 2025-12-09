import { Module } from '@nestjs/common';
import { ProfesionalesController } from './profesionales.controller';
import { ProfesionalesService } from './profesionales.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
    controllers: [ProfesionalesController],
    providers: [ProfesionalesService, PrismaService],
})
export class ProfesionalesModule { }

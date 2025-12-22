import { Module } from '@nestjs/common';
import { TurnosController } from './turnos.controller';
import { TurnosService } from './turnos.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
    controllers: [TurnosController],
    providers: [TurnosService, PrismaService],
})
export class TurnosModule { }

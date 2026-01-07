import { Module } from '@nestjs/common';
import { PacientesController } from './pacientes.controller';
import { PacientesService } from './pacientes.service';
import { PrismaService } from '@/src/prisma/prisma.service';

@Module({
  controllers: [PacientesController],
  providers: [PacientesService, PrismaService],
})
export class PacientesModule {}

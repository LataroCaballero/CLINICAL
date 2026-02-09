import { Module } from '@nestjs/common';
import { AlertasController } from './alertas.controller';
import { AlertasService } from './alertas.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [AlertasController],
  providers: [AlertasService, PrismaService],
  exports: [AlertasService],
})
export class AlertasModule {}

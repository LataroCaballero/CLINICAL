import { Module } from '@nestjs/common';
import { ObrasSocialesController } from './obras-sociales.controller';
import { ObrasSocialesService } from './obras-sociales.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ObrasSocialesController],
  providers: [ObrasSocialesService, PrismaService],
})
export class ObrasSocialesModule {}

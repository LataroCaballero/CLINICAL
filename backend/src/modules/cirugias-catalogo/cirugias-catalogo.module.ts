import { Module } from '@nestjs/common';
import { CirugiasCatalogoController } from './cirugias-catalogo.controller';
import { CirugiasCatalogoService } from './cirugias-catalogo.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CirugiasCatalogoController],
  providers: [CirugiasCatalogoService],
  exports: [CirugiasCatalogoService],
})
export class CirugiasCatalogoModule {}

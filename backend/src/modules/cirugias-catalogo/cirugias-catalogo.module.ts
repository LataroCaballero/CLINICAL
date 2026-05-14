import { Module } from '@nestjs/common';
import { CirugiasCatalogoController } from './cirugias-catalogo.controller';
import { CirugiasCatalogoService } from './cirugias-catalogo.service';

@Module({
  controllers: [CirugiasCatalogoController],
  providers: [CirugiasCatalogoService],
  exports: [CirugiasCatalogoService],
})
export class CirugiasCatalogoModule {}

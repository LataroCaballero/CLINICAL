import { Module } from '@nestjs/common';
import { CatalogoHCController } from './catalogo-hc.controller';
import { CatalogoHCService } from './catalogo-hc.service';

@Module({
  // PrismaModule is @Global() — PrismaService injected without imports
  controllers: [CatalogoHCController],
  providers: [CatalogoHCService],
  exports: [CatalogoHCService], // UsuariosModule and Phase 46 inject this
})
export class CatalogoHCModule {}

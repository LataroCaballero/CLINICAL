import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { AuthModule } from '../auth/auth.module';
import { CatalogoHCModule } from '../catalogo-hc/catalogo-hc.module';

@Module({
  imports: [AuthModule, CatalogoHCModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}

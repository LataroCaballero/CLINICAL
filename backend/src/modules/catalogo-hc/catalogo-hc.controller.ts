import {
  Controller,
  Get,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { CatalogoHCService } from './catalogo-hc.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { RolUsuario } from '@prisma/client';

@Controller('catalogo-hc')
@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
export class CatalogoHCController {
  constructor(
    private readonly service: CatalogoHCService,
    private readonly prisma: PrismaService,
  ) {}

  // Copied from tratamientos.controller.ts — pattern: copy, not extract to shared
  private async getProfesionalId(
    user: any,
    targetProfesionalId?: string,
  ): Promise<string> {
    // SECRETARIA / ADMIN pueden operar sobre cualquier profesional
    // siempre que pasen el profesionalId como query param
    if (
      (user.rol === RolUsuario.SECRETARIA || user.rol === RolUsuario.ADMIN) &&
      targetProfesionalId
    ) {
      return targetProfesionalId;
    }

    if (user.rol !== RolUsuario.PROFESIONAL) {
      throw new ForbiddenException(
        'Se requiere profesionalId para gestionar el catálogo HC',
      );
    }

    const profesional = await this.prisma.profesional.findUnique({
      where: { usuarioId: user.userId },
    });

    if (!profesional) {
      throw new ForbiddenException('Perfil profesional no encontrado');
    }

    return profesional.id;
  }

  @Get()
  async getCatalogo(
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.service.getCatalogoConSeed(pid);
  }
}

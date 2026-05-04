import { Controller, Get, Query, Req, ForbiddenException } from '@nestjs/common';
import { OrdenesConsumoService } from './ordenes-consumo.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { RolUsuario } from '@prisma/client';

@Controller('ordenes-consumo')
@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
export class OrdenesConsumoController {
  constructor(
    private readonly ordenesConsumoService: OrdenesConsumoService,
    private readonly prisma: PrismaService,
  ) {}

  private async getProfesionalId(
    user: any,
    targetProfesionalId?: string,
  ): Promise<string> {
    if (
      (user.rol === RolUsuario.SECRETARIA || user.rol === RolUsuario.ADMIN) &&
      targetProfesionalId
    ) {
      return targetProfesionalId;
    }

    if (user.rol !== RolUsuario.PROFESIONAL) {
      throw new ForbiddenException(
        'Se requiere profesionalId para gestionar órdenes de consumo',
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
  async findPendientes(
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.ordenesConsumoService.findPendientesByProfesional(pid);
  }
}

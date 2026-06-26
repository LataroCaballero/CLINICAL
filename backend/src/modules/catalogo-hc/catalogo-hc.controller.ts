import {
  Controller,
  Get,
  Patch,
  Delete,
  Query,
  Req,
  Param,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { CatalogoHCService } from './catalogo-hc.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { RolUsuario } from '@prisma/client';
import { RenameItemDto } from './dto/rename-item.dto';

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

  // ---------------------------------------------------------------------------
  // Flat per-professional catalog endpoints (antecedentes / alergias / medicamentos)
  // All scoped to the JWT-resolved profesionalId via getProfesionalId (PITFALL 12).
  // profesionalId is NEVER read from the request body.
  // ---------------------------------------------------------------------------

  @Get('antecedentes')
  async getAntecedentes(
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.service.getAntecedentesConSeed(pid);
  }

  @Get('alergias')
  async getAlergias(
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.service.getAlergiasConSeed(pid);
  }

  @Get('medicamentos')
  async getMedicamentos(
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.service.getMedicamentosConSeed(pid);
  }

  // ---------------------------------------------------------------------------
  // Rename endpoints
  // ---------------------------------------------------------------------------

  @Patch('zonas/:id')
  async renombrarZona(
    @Param('id') id: string,
    @Body() dto: RenameItemDto,
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.service.renombrarZona(pid, id, dto.nombre);
  }

  @Patch('diagnosticos/:id')
  async renombrarDiagnostico(
    @Param('id') id: string,
    @Body() dto: RenameItemDto,
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.service.renombrarDiagnostico(pid, id, dto.nombre);
  }

  @Patch('tratamientos/:id')
  async renombrarTratamiento(
    @Param('id') id: string,
    @Body() dto: RenameItemDto,
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.service.renombrarTratamiento(pid, id, dto.nombre);
  }

  // ---------------------------------------------------------------------------
  // Soft-delete endpoints
  // ---------------------------------------------------------------------------

  @Delete('zonas/:id')
  async eliminarZona(
    @Param('id') id: string,
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.service.eliminarZona(pid, id);
  }

  @Delete('diagnosticos/:id')
  async eliminarDiagnostico(
    @Param('id') id: string,
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.service.eliminarDiagnostico(pid, id);
  }

  @Delete('tratamientos/:id')
  async eliminarTratamiento(
    @Param('id') id: string,
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.service.eliminarTratamiento(pid, id);
  }
}

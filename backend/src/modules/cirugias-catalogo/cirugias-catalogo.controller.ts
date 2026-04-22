import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Query,
  Body,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { CirugiasCatalogoService } from './cirugias-catalogo.service';
import { CreateCirugiaCatalogoDto } from './dto/create-cirugia-catalogo.dto';
import { UpdateCirugiaCatalogoDto } from './dto/update-cirugia-catalogo.dto';
import { SetInsumosCirugiaDto } from './dto/set-insumos-cirugia.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { RolUsuario } from '@prisma/client';

@Controller('cirugias-catalogo')
@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
export class CirugiasCatalogoController {
  constructor(
    private readonly cirugiasCatalogoService: CirugiasCatalogoService,
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
        'Se requiere profesionalId para gestionar cirugías',
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
  async findAll(
    @Req() req: any,
    @Query('includeInactive') includeInactive?: string,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.cirugiasCatalogoService.findAllByProfesional(
      pid,
      includeInactive === 'true',
    );
  }

  @Post()
  async create(
    @Req() req: any,
    @Body() dto: CreateCirugiaCatalogoDto,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.cirugiasCatalogoService.create(pid, dto);
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCirugiaCatalogoDto,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.cirugiasCatalogoService.update(id, pid, dto);
  }

  @Delete(':id')
  async softDelete(
    @Req() req: any,
    @Param('id') id: string,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.cirugiasCatalogoService.softDelete(id, pid);
  }

  @Post(':id/restore')
  async restore(
    @Req() req: any,
    @Param('id') id: string,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.cirugiasCatalogoService.restore(id, pid);
  }

  @Put(':id/insumos')
  async setInsumos(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SetInsumosCirugiaDto,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.cirugiasCatalogoService.setInsumos(id, pid, dto.insumos);
  }

  @Post(':id/recalcular-precio')
  async recalcularPrecio(
    @Req() req: any,
    @Param('id') id: string,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.cirugiasCatalogoService.recalcularPrecioBase(id, pid);
  }
}

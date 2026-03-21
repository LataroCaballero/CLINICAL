import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Query,
  Body,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { TratamientosService } from './tratamientos.service';
import { CreateTratamientoDto } from './dto/create-tratamiento.dto';
import { UpdateTratamientoDto } from './dto/update-tratamiento.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { RolUsuario } from '@prisma/client';

@Controller('tratamientos')
@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
export class TratamientosController {
  constructor(
    private readonly tratamientosService: TratamientosService,
    private readonly prisma: PrismaService,
  ) {}

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
        'Se requiere profesionalId para gestionar tratamientos',
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

  // =====================
  // Catalogo (legacy)
  // =====================

  @Get('catalogo')
  findAllCatalogo(@Query('q') q?: string) {
    return this.tratamientosService.findAllCatalogo(q);
  }

  @Post('catalogo')
  createCatalogo(@Body() dto: { nombre: string }) {
    return this.tratamientosService.createCatalogo(dto.nombre);
  }

  @Delete('catalogo/:id')
  removeCatalogo(@Param('id') id: string) {
    return this.tratamientosService.removeCatalogo(id);
  }

  // =====================
  // Tratamientos por Profesional
  // =====================

  @Get('me')
  async findMyTratamientos(
    @Req() req: any,
    @Query('includeInactive') includeInactive?: string,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.tratamientosService.findAllByProfesional(
      pid,
      includeInactive === 'true',
    );
  }

  @Get(':id')
  async findOne(
    @Req() req: any,
    @Param('id') id: string,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.tratamientosService.findById(id, pid);
  }

  @Post()
  async create(
    @Req() req: any,
    @Body() dto: CreateTratamientoDto,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.tratamientosService.create(pid, dto);
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTratamientoDto,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.tratamientosService.update(id, pid, dto);
  }

  @Delete(':id')
  async remove(
    @Req() req: any,
    @Param('id') id: string,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.tratamientosService.softDelete(id, pid);
  }

  @Post(':id/restore')
  async restore(
    @Req() req: any,
    @Param('id') id: string,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.tratamientosService.restore(id, pid);
  }
}

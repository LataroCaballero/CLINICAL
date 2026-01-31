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
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { TratamientosService } from './tratamientos.service';
import { CreateTratamientoDto } from './dto/create-tratamiento.dto';
import { UpdateTratamientoDto } from './dto/update-tratamiento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { RolUsuario } from '@prisma/client';

@Controller('tratamientos')
@UseGuards(JwtAuthGuard)
export class TratamientosController {
  constructor(
    private readonly tratamientosService: TratamientosService,
    private readonly prisma: PrismaService,
  ) {}

  private async getProfesionalId(user: any): Promise<string> {
    if (user.rol !== RolUsuario.PROFESIONAL) {
      throw new ForbiddenException(
        'Solo profesionales pueden gestionar tratamientos',
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
  ) {
    const profesionalId = await this.getProfesionalId(req.user);
    return this.tratamientosService.findAllByProfesional(
      profesionalId,
      includeInactive === 'true',
    );
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const profesionalId = await this.getProfesionalId(req.user);
    return this.tratamientosService.findById(id, profesionalId);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateTratamientoDto) {
    const profesionalId = await this.getProfesionalId(req.user);
    return this.tratamientosService.create(profesionalId, dto);
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTratamientoDto,
  ) {
    const profesionalId = await this.getProfesionalId(req.user);
    return this.tratamientosService.update(id, profesionalId, dto);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const profesionalId = await this.getProfesionalId(req.user);
    return this.tratamientosService.softDelete(id, profesionalId);
  }

  @Post(':id/restore')
  async restore(@Req() req: any, @Param('id') id: string) {
    const profesionalId = await this.getProfesionalId(req.user);
    return this.tratamientosService.restore(id, profesionalId);
  }
}

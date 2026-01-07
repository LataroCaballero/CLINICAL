import {
  Controller,
  Get,
  Patch,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ProfesionalesService } from './profesionales.service';
import { UpdateProfesionalDto } from './dto/update-profesional.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolUsuario } from '@prisma/client';

@Controller('profesionales')
export class ProfesionalesController {
  constructor(private readonly profesionalesService: ProfesionalesService) {}

  @Get()
  findAll() {
    return this.profesionalesService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    const user = req.user;

    if (user.rol !== RolUsuario.PROFESIONAL) {
      throw new ForbiddenException('Solo profesionales pueden acceder');
    }

    return this.profesionalesService.findByUserId(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.profesionalesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProfesionalDto,
    @Req() req: any,
  ) {
    const user = req.user;

    // Solo el propio profesional puede editar
    if (user.rol === RolUsuario.PROFESIONAL) {
      const profesional = await this.profesionalesService.findByUserId(
        user.userId,
      );
      if (profesional.id !== id) {
        throw new ForbiddenException(
          'Solo podés editar tu propia configuración',
        );
      }
    } else {
      throw new ForbiddenException('Solo profesionales pueden editar');
    }

    return this.profesionalesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/agenda')
  getAgenda(@Param('id') id: string) {
    return this.profesionalesService.getAgenda(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/agenda')
  async updateAgenda(
    @Param('id') id: string,
    @Body() dto: UpdateAgendaDto,
    @Req() req: any,
  ) {
    const user = req.user;

    // Solo el propio profesional puede editar su agenda
    if (user.rol === RolUsuario.PROFESIONAL) {
      const profesional = await this.profesionalesService.findByUserId(
        user.userId,
      );
      if (profesional.id !== id) {
        throw new ForbiddenException('Solo podés editar tu propia agenda');
      }
    } else {
      throw new ForbiddenException('Solo profesionales pueden editar');
    }

    return this.profesionalesService.updateAgenda(id, dto);
  }
}

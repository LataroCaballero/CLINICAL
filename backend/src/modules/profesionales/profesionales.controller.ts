import {
  Controller,
  Get,
  Patch,
  Put,
  Param,
  Body,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ProfesionalesService } from './profesionales.service';
import { UpdateProfesionalDto } from './dto/update-profesional.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { RolUsuario } from '@prisma/client';

@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR')
@Controller('profesionales')
export class ProfesionalesController {
  constructor(private readonly profesionalesService: ProfesionalesService) {}

  @Get()
  findAll() {
    return this.profesionalesService.findAll();
  }

  @Get('me')
  async getMe(@Req() req: any) {
    const user = req.user;

    if (user.rol !== RolUsuario.PROFESIONAL) {
      throw new ForbiddenException('Solo profesionales pueden acceder');
    }

    return this.profesionalesService.findByUserId(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.profesionalesService.findOne(id);
  }

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

  @Get(':id/agenda')
  getAgenda(@Param('id') id: string) {
    return this.profesionalesService.getAgenda(id);
  }

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

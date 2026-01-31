import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { OrdenesCompraService } from '../services/ordenes-compra.service';
import { CreateOrdenCompraDto, RecibirOrdenCompraDto } from '../dto';
import { resolveScope } from 'src/common/scope/resolve-scope';
import { EstadoOrdenCompra } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('ordenes-compra')
export class OrdenesCompraController {
  constructor(private readonly ordenesCompraService: OrdenesCompraService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
    @Query('estado') estado?: EstadoOrdenCompra,
  ) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    if (!scope.profesionalId) {
      return [];
    }

    return this.ordenesCompraService.findAll(scope.profesionalId, estado);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    if (!scope.profesionalId) {
      return null;
    }

    return this.ordenesCompraService.findOne(id, scope.profesionalId);
  }

  @Post()
  create(
    @Body() dto: CreateOrdenCompraDto,
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    if (!scope.profesionalId) {
      throw new Error('Se requiere un profesional para crear órdenes');
    }

    return this.ordenesCompraService.create(dto, scope.profesionalId);
  }

  @Patch(':id/estado')
  actualizarEstado(
    @Param('id') id: string,
    @Body('estado') estado: EstadoOrdenCompra,
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    if (!scope.profesionalId) {
      throw new Error('Se requiere un profesional');
    }

    return this.ordenesCompraService.actualizarEstado(
      id,
      scope.profesionalId,
      estado,
    );
  }

  @Post(':id/recibir')
  recibir(
    @Param('id') id: string,
    @Body() dto: RecibirOrdenCompraDto,
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    if (!scope.profesionalId) {
      throw new Error('Se requiere un profesional para recibir órdenes');
    }

    return this.ordenesCompraService.recibir(
      id,
      scope.profesionalId,
      req.user.userId,
      dto,
    );
  }

  @Post(':id/cancelar')
  cancelar(
    @Param('id') id: string,
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    if (!scope.profesionalId) {
      throw new Error('Se requiere un profesional');
    }

    return this.ordenesCompraService.cancelar(id, scope.profesionalId);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { Auth } from 'src/modules/auth/decorators/auth.decorator';
import { VentasProductoService } from '../services/ventas-producto.service';
import { CreateVentaProductoDto } from '../dto';
import { resolveScope } from 'src/common/scope/resolve-scope';

@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR')
@Controller('ventas-producto')
export class VentasProductoController {
  constructor(private readonly ventasProductoService: VentasProductoService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
    @Query('pacienteId') pacienteId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    if (!scope.profesionalId) {
      return [];
    }

    return this.ventasProductoService.findAll(scope.profesionalId, {
      pacienteId,
      desde: desde ? new Date(desde) : undefined,
      hasta: hasta ? new Date(hasta) : undefined,
    });
  }

  @Get('resumen')
  getResumen(
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    if (!scope.profesionalId) {
      return { totalVentas: 0, cantidadVentas: 0, ventasPorProducto: [] };
    }

    // Default: último mes
    const fechaHasta = hasta ? new Date(hasta) : new Date();
    const fechaDesde = desde
      ? new Date(desde)
      : new Date(fechaHasta.getTime() - 30 * 24 * 60 * 60 * 1000);

    return this.ventasProductoService.getResumen(
      scope.profesionalId,
      fechaDesde,
      fechaHasta,
    );
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

    return this.ventasProductoService.findOne(id, scope.profesionalId);
  }

  @Post()
  create(
    @Body() dto: CreateVentaProductoDto,
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    if (!scope.profesionalId) {
      throw new Error('Se requiere un profesional para registrar ventas');
    }

    return this.ventasProductoService.create(
      dto,
      scope.profesionalId,
      req.user.userId,
    );
  }
}

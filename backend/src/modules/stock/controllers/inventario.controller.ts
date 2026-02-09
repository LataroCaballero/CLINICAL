import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { Auth } from 'src/modules/auth/decorators/auth.decorator';
import { InventarioService } from '../services/inventario.service';
import {
  CreateMovimientoStockDto,
  CreateLoteDto,
  UpdateInventarioDto,
} from '../dto';
import { resolveScope } from 'src/common/scope/resolve-scope';

@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR')
@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
    @Query('bajoStock') bajoStock?: string,
  ) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    if (!scope.profesionalId) {
      return [];
    }

    return this.inventarioService.findAll(scope.profesionalId, {
      bajoStock: bajoStock === 'true',
    });
  }

  @Get('alertas')
  getAlertas(@Req() req: any, @Query('profesionalId') profesionalId?: string) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    if (!scope.profesionalId) {
      return [];
    }

    return this.inventarioService.getAlertas(scope.profesionalId);
  }

  @Get('proximos-vencer')
  getProximosVencer(
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
    @Query('dias') dias?: string,
  ) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    if (!scope.profesionalId) {
      return [];
    }

    return this.inventarioService.getProximosVencer(
      scope.profesionalId,
      dias ? parseInt(dias, 10) : 30,
    );
  }

  @Get(':productoId')
  findByProducto(
    @Param('productoId') productoId: string,
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

    return this.inventarioService.findByProducto(
      productoId,
      scope.profesionalId,
    );
  }

  @Get(':productoId/movimientos')
  getMovimientos(
    @Param('productoId') productoId: string,
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    if (!scope.profesionalId) {
      return [];
    }

    return this.inventarioService.getMovimientos(
      productoId,
      scope.profesionalId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get(':productoId/lotes')
  getLotes(
    @Param('productoId') productoId: string,
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    if (!scope.profesionalId) {
      return [];
    }

    return this.inventarioService.getLotes(productoId, scope.profesionalId);
  }

  @Patch(':productoId')
  updateInventario(
    @Param('productoId') productoId: string,
    @Body() dto: UpdateInventarioDto,
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

    return this.inventarioService.updateInventario(
      productoId,
      scope.profesionalId,
      dto,
    );
  }

  @Post('movimiento')
  registrarMovimiento(
    @Body() dto: CreateMovimientoStockDto,
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    if (!scope.profesionalId) {
      throw new Error('Se requiere un profesional para registrar movimientos');
    }

    return this.inventarioService.registrarMovimiento(
      dto,
      scope.profesionalId,
      req.user.userId,
    );
  }

  @Post('lotes')
  crearLote(
    @Body() dto: CreateLoteDto,
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });

    if (!scope.profesionalId) {
      throw new Error('Se requiere un profesional para crear lotes');
    }

    return this.inventarioService.crearLote(dto, scope.profesionalId);
  }
}

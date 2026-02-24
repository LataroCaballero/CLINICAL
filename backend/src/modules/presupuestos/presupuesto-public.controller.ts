import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PresupuestosService } from './presupuestos.service';

// No @Auth() decorator = public, no JWT required
// Auth guard is controller-scoped via @Auth() on PresupuestosController,
// so this separate controller class has no guard applied.
@Controller('presupuestos/public')
export class PresupuestoPublicController {
  constructor(private readonly service: PresupuestosService) {}

  @Get(':token')
  getPublicPresupuesto(@Param('token') token: string) {
    return this.service.findByToken(token);
  }

  @Post(':token/aceptar')
  aceptarPublic(@Param('token') token: string) {
    return this.service.aceptarByToken(token);
  }

  @Post(':token/rechazar')
  rechazarPublic(
    @Param('token') token: string,
    @Body() body: { motivoRechazo?: string },
  ) {
    return this.service.rechazarByToken(token, body.motivoRechazo);
  }
}

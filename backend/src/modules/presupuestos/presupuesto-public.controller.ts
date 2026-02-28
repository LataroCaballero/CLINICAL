import { Controller, Get, Post, Param, Body, Res } from '@nestjs/common';
import { Response } from 'express';
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

  /**
   * GET /presupuestos/public/:id/pdf
   * Returns the presupuesto PDF buffer without auth.
   * Used by WhatsApp Cloud API to fetch the document before delivery.
   * No @Auth() — intentionally public so Meta can fetch the URL.
   */
  @Get(':id/pdf')
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.service.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}

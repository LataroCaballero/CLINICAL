import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { PresupuestosService } from './presupuestos.service';
import { PresupuestoEmailService } from './presupuesto-email.service';
import { CreatePresupuestoDto } from './dto/create-presupuesto.dto';
import { EnviarEmailPresupuestoDto } from './dto/enviar-email-presupuesto.dto';
import { Auth } from '../auth/decorators/auth.decorator';

@Controller('presupuestos')
@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR')
export class PresupuestosController {
  constructor(
    private readonly service: PresupuestosService,
    private readonly emailService: PresupuestoEmailService,
  ) {}

  @Post()
  create(@Body() dto: CreatePresupuestoDto) {
    return this.service.create(dto);
  }

  @Get()
  findByPaciente(@Query('pacienteId') pacienteId: string) {
    return this.service.findByPaciente(pacienteId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/aceptar')
  aceptar(@Param('id') id: string) {
    return this.service.aceptar(id);
  }

  @Patch(':id/marcar-enviado')
  marcarEnviado(@Param('id') id: string) {
    return this.service.marcarEnviado(id);
  }

  @Patch(':id/rechazar')
  rechazar(@Param('id') id: string, @Body() body: { motivoRechazo?: string }) {
    return this.service.rechazar(id, body);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.service.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post(':id/enviar-email')
  async enviarEmail(
    @Param('id') id: string,
    @Body() dto: EnviarEmailPresupuestoDto,
  ) {
    await this.emailService.enviarPresupuestoPorEmail(
      id,
      dto.emailDestino,
      dto.notaCoordinador,
    );
    return { message: 'Email enviado exitosamente' };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

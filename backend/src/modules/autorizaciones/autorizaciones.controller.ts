import { Controller, Post, Get, Patch, Param, Body, Query, Req } from '@nestjs/common';
import { AutorizacionesService } from './autorizaciones.service';
import { CreateAutorizacionDto } from './dto/create-autorizacion.dto';
import {
  AutorizarAutorizacionDto,
  RechazarAutorizacionDto,
} from './dto/autorizar-autorizacion.dto';
import { Auth } from '../auth/decorators/auth.decorator';

@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR')
@Controller('autorizaciones')
export class AutorizacionesController {
  constructor(private readonly autorizacionesService: AutorizacionesService) {}

  @Post()
  create(@Body() dto: CreateAutorizacionDto, @Req() req: any) {
    const profesionalIdFromJwt = req.user?.profesionalId as string | null;
    const registradoPorId = req.user?.userId as string | undefined;
    return this.autorizacionesService.createAutorizacion(dto, profesionalIdFromJwt, registradoPorId);
  }

  @Get()
  findAll(
    @Query('estado') estado?: string,
    @Query('profesionalId') profesionalId?: string,
    @Query('pacienteId') pacienteId?: string,
  ) {
    return this.autorizacionesService.findAll(estado, profesionalId, pacienteId);
  }

  @Patch(':id/autorizar')
  autorizar(
    @Param('id') id: string,
    @Body() dto: AutorizarAutorizacionDto,
    @Req() req: any,
  ) {
    const autorizadoPorId = req.user?.userId as string | undefined;
    return this.autorizacionesService.autorizarCodigos(id, dto, autorizadoPorId);
  }

  @Patch(':id/rechazar')
  rechazar(
    @Param('id') id: string,
    @Body() dto: RechazarAutorizacionDto,
    @Req() req: any,
  ) {
    const rechazadoPorId = req.user?.userId as string | undefined;
    return this.autorizacionesService.rechazarCodigos(id, dto.nota, rechazadoPorId);
  }
}

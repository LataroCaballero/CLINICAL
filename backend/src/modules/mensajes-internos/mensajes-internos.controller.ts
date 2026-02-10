import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { MensajesInternosService } from './mensajes-internos.service';
import { CreateMensajeDto } from './dto/create-mensaje.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { resolveScope } from '@/src/common/scope/resolve-scope';

@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR')
@Controller('mensajes-internos')
export class MensajesInternosController {
  constructor(private readonly mensajesService: MensajesInternosService) {}

  /**
   * Lista de chats (pacientes con mensajes) con ultimo mensaje y contadores
   */
  @Get('chats')
  findChats(@Req() req: any, @Query('profesionalId') profesionalId?: string) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });
    return this.mensajesService.findChats(scope);
  }

  /**
   * Contadores de mensajes no leidos (para badge en topbar)
   */
  @Get('no-leidos')
  getNoLeidos(@Req() req: any, @Query('profesionalId') profesionalId?: string) {
    const scope = resolveScope({
      user: req.user,
      requestedProfesionalId: profesionalId,
    });
    return this.mensajesService.getContadoresNoLeidos(scope);
  }

  /**
   * Mensajes de un paciente especifico
   */
  @Get('paciente/:pacienteId')
  findByPaciente(@Param('pacienteId') pacienteId: string, @Req() req: any) {
    if (!pacienteId) {
      throw new BadRequestException('pacienteId es requerido');
    }
    return this.mensajesService.findByPaciente(pacienteId, req.user.userId);
  }

  /**
   * Crear nuevo mensaje
   */
  @Post()
  create(@Body() dto: CreateMensajeDto, @Req() req: any) {
    return this.mensajesService.create(dto, req.user.userId);
  }

  /**
   * Marcar un mensaje como leido
   */
  @Patch(':id/leer')
  marcarLeido(@Param('id') id: string, @Req() req: any) {
    return this.mensajesService.marcarLeido(id, req.user.userId);
  }

  /**
   * Marcar todos los mensajes de un paciente como leidos
   */
  @Patch('paciente/:pacienteId/leer-todos')
  marcarTodosLeidos(@Param('pacienteId') pacienteId: string, @Req() req: any) {
    return this.mensajesService.marcarTodosLeidos(pacienteId, req.user.userId);
  }
}

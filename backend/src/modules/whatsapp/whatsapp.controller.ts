import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { SaveWabaConfigDto } from './dto/save-waba-config.dto';
import { SendWaMessageDto, SendWaFreeTextDto } from './dto/send-wa-message.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /whatsapp/test-queue
   * Encola un test-job en BullMQ para verificar que la queue funciona.
   * TEMPORAL: solo para smoke test Phase 1.
   * TODO: remover antes de Phase 4 o mover a admin-only route dedicada.
   */
  @Post('test-queue')
  @Auth('ADMIN')
  async testQueue(): Promise<{ queued: boolean; jobId: string }> {
    return this.whatsappService.enqueueTestJob();
  }

  /**
   * GET /whatsapp/config
   * Returns WABA configuration for the current professional (safe fields only).
   * SECURITY: accessTokenEncrypted is never included in the response.
   */
  @Get('config')
  @Auth('ADMIN', 'PROFESIONAL')
  async getConfig(@Req() req: any) {
    const profesionalId = req.user.profesionalId as string;
    return this.whatsappService.getWabaConfig(profesionalId);
  }

  /**
   * POST /whatsapp/config
   * Saves WABA credentials for the current professional.
   * Validates against Meta Graph API before encrypting and persisting.
   * SECURITY: accessToken is never stored in plaintext.
   */
  @Post('config')
  @Auth('ADMIN', 'PROFESIONAL')
  async saveConfig(@Req() req: any, @Body() dto: SaveWabaConfigDto) {
    const profesionalId = req.user.profesionalId as string;
    return this.whatsappService.saveWabaConfig(profesionalId, dto);
  }

  /**
   * GET /whatsapp/templates
   * Returns approved WhatsApp message templates from Meta Business API.
   * SECRETARIA: returns 400 — no profesionalId in token, must use patient-scoped endpoints.
   */
  @Get('templates')
  @Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
  async getTemplates(@Req() req: any) {
    let profesionalId = req.user?.profesionalId as string | null;
    if (!profesionalId) {
      throw new BadRequestException(
        'SECRETARIA debe estar asociada a un profesional para listar templates',
      );
    }
    return this.whatsappService.listApprovedTemplates(profesionalId);
  }

  /**
   * GET /whatsapp/mensajes/:pacienteId
   * Returns the full message thread for a patient with direccion field for bubble direction.
   */
  @Get('mensajes/:pacienteId')
  @Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
  async getThread(@Req() req: any, @Param('pacienteId') pacienteId: string) {
    let profesionalId = req.user?.profesionalId as string | null;
    if (!profesionalId) {
      const paciente = await this.prisma.paciente.findUnique({
        where: { id: pacienteId },
        select: { profesionalId: true },
      });
      if (!paciente) throw new NotFoundException('Paciente no encontrado');
      profesionalId = paciente.profesionalId;
    }
    if (!profesionalId) {
      throw new BadRequestException(
        'No se pudo determinar el profesional asociado al paciente',
      );
    }
    return this.whatsappService.getMessageThread(profesionalId, pacienteId);
  }

  /**
   * POST /whatsapp/mensajes
   * Sends a WhatsApp template message. Creates DB record and enqueues send job.
   */
  @Post('mensajes')
  @Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
  async sendMessage(@Req() req: any, @Body() dto: SendWaMessageDto) {
    let profesionalId = req.user?.profesionalId as string | null;
    if (!profesionalId) {
      const paciente = await this.prisma.paciente.findUnique({
        where: { id: dto.pacienteId },
        select: { profesionalId: true },
      });
      if (!paciente) throw new NotFoundException('Paciente no encontrado');
      profesionalId = paciente.profesionalId;
    }
    if (!profesionalId) {
      throw new BadRequestException(
        'No se pudo determinar el profesional asociado al paciente',
      );
    }
    return this.whatsappService.sendTemplateMessage(profesionalId, dto);
  }

  /**
   * POST /whatsapp/mensajes/free-text
   * Sends a free-text WhatsApp reply. Requires 24h conversation window to be open.
   */
  @Post('mensajes/free-text')
  @Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
  async sendFreeText(@Req() req: any, @Body() dto: SendWaFreeTextDto) {
    let profesionalId = req.user?.profesionalId as string | null;
    if (!profesionalId) {
      const paciente = await this.prisma.paciente.findUnique({
        where: { id: dto.pacienteId },
        select: { profesionalId: true },
      });
      if (!paciente) throw new NotFoundException('Paciente no encontrado');
      profesionalId = paciente.profesionalId;
    }
    if (!profesionalId) {
      throw new BadRequestException(
        'No se pudo determinar el profesional asociado al paciente',
      );
    }
    return this.whatsappService.sendFreeText(
      profesionalId,
      dto.pacienteId,
      dto.texto,
    );
  }

  /**
   * GET /whatsapp/unread
   * Returns {pacienteId: unreadCount} map for the authenticated profesional.
   * Unread = inbound messages received after the last outbound message per patient.
   * SECRETARIA: returns {} immediately — no crash, no NotFoundException.
   */
  @Get('unread')
  @Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
  async getUnreadCounts(@Req() req: any): Promise<Record<string, number>> {
    const profesionalId = req.user?.profesionalId as string | null;
    if (!profesionalId) {
      return {};
    }
    return this.whatsappService.getUnreadCounts(profesionalId);
  }

  /**
   * POST /whatsapp/mensajes/:id/retry
   * Resets a failed message to PENDIENTE and re-enqueues the send job.
   */
  @Post('mensajes/:id/retry')
  @Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
  async retryMessage(@Req() req: any, @Param('id') mensajeId: string) {
    let profesionalId = req.user?.profesionalId as string | null;
    if (!profesionalId) {
      const mensaje = await this.prisma.mensajeWhatsApp.findUnique({
        where: { id: mensajeId },
        select: { profesionalId: true },
      });
      if (!mensaje) throw new NotFoundException('Mensaje no encontrado');
      profesionalId = mensaje.profesionalId;
    }
    if (!profesionalId) {
      throw new BadRequestException(
        'No se pudo determinar el profesional asociado al mensaje',
      );
    }
    return this.whatsappService.retryMessage(profesionalId, mensajeId);
  }

  /**
   * POST /whatsapp/presupuesto/:presupuestoId/send
   * Sends a presupuesto PDF as a WhatsApp document message.
   */
  @Post('presupuesto/:presupuestoId/send')
  @Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
  async sendPresupuesto(
    @Req() req: any,
    @Param('presupuestoId') presupuestoId: string,
    @Body() body: { pacienteId: string },
  ) {
    let profesionalId = req.user?.profesionalId as string | null;
    if (!profesionalId) {
      const paciente = await this.prisma.paciente.findUnique({
        where: { id: body.pacienteId },
        select: { profesionalId: true },
      });
      if (!paciente) throw new NotFoundException('Paciente no encontrado');
      profesionalId = paciente.profesionalId;
    }
    if (!profesionalId) {
      throw new BadRequestException(
        'No se pudo determinar el profesional asociado al paciente',
      );
    }
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';
    if (!process.env.BACKEND_URL) {
      this.logger.warn(
        'BACKEND_URL is not set — using http://localhost:3001. Meta cannot fetch PDFs from localhost in production.',
      );
    }
    const pdfPublicUrl = `${backendUrl}/presupuestos/public/${presupuestoId}/pdf`;
    return this.whatsappService.sendPresupuestoPdf(
      profesionalId,
      body.pacienteId,
      presupuestoId,
      pdfPublicUrl,
    );
  }
}

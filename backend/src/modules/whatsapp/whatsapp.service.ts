import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from './crypto/encryption.service';
import { WHATSAPP_QUEUE } from './processors/whatsapp-message.processor';
import { SaveWabaConfigDto } from './dto/save-waba-config.dto';
import { WabaConfigResponseDto } from './dto/waba-config-response.dto';
import { SendWaMessageDto } from './dto/send-wa-message.dto';

@Injectable()
export class WhatsappService {
  // Parameterized Meta API version — update here when Meta deprecates older versions
  private readonly META_API_VERSION = 'v21.0';
  private readonly META_GRAPH_URL = 'https://graph.facebook.com';

  constructor(
    @InjectQueue(WHATSAPP_QUEUE) private readonly whatsappQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Encola un job de prueba para verificar que BullMQ + NestJS v10 funcionen.
   * Usado por el endpoint POST /whatsapp/test-queue durante Phase 1 smoke test.
   */
  async enqueueTestJob(): Promise<{ queued: boolean; jobId: string }> {
    const job = await this.whatsappQueue.add(
      'test-job',
      { test: true, timestamp: new Date().toISOString() },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: false, // Mantener para inspección post-test
      },
    );
    return { queued: true, jobId: job.id as string };
  }

  /**
   * Validates WABA credentials against Meta Graph API.
   * Throws BadRequestException with descriptive message on failure.
   * NOTE: accessToken is NEVER stored — validation only.
   */
  async validateWABACredentials(
    phoneNumberId: string,
    accessToken: string,
  ): Promise<{ displayPhone: string; verifiedName: string | undefined }> {
    const url = `${this.META_GRAPH_URL}/${this.META_API_VERSION}/${phoneNumberId}`;
    try {
      const response = await axios.get(url, {
        params: { fields: 'display_phone_number,verified_name' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return {
        displayPhone: response.data.display_phone_number as string,
        verifiedName: response.data.verified_name as string | undefined,
      };
    } catch (err: any) {
      const metaMsg =
        err.response?.data?.error?.message ?? 'Credenciales inválidas';
      const metaCode = err.response?.data?.error?.code;
      if (metaCode === 190)
        throw new BadRequestException(`Token inválido: ${metaMsg}`);
      if (metaCode === 100)
        throw new BadRequestException(
          `Phone Number ID inválido: ${metaMsg}`,
        );
      throw new BadRequestException(`Meta API: ${metaMsg}`);
    }
  }

  /**
   * Saves WABA configuration for a professional.
   * Flow: 1) Validate against Meta 2) Encrypt token 3) Upsert DB 4) Return safe DTO
   * SECURITY: accessToken is NEVER persisted in plaintext — only the encrypted form.
   */
  async saveWabaConfig(
    profesionalId: string,
    dto: SaveWabaConfigDto,
  ): Promise<WabaConfigResponseDto> {
    // 1. Validate credentials against Meta BEFORE encrypting/saving
    const { displayPhone, verifiedName } = await this.validateWABACredentials(
      dto.phoneNumberId,
      dto.accessToken,
    );

    // 2. Encrypt the access token — NEVER persist in plaintext
    const accessTokenEncrypted = this.encryptionService.encrypt(
      dto.accessToken,
    );

    // 3. Upsert (create or update) the professional's WABA configuration
    const config = await this.prisma.configuracionWABA.upsert({
      where: { profesionalId },
      create: {
        profesionalId,
        phoneNumberId: dto.phoneNumberId,
        wabaId: dto.wabaId,
        accessTokenEncrypted,
        displayPhone,
        verifiedName,
        activo: true,
      },
      update: {
        phoneNumberId: dto.phoneNumberId,
        wabaId: dto.wabaId,
        accessTokenEncrypted,
        displayPhone,
        verifiedName,
        activo: true,
      },
    });

    // 4. Return only safe fields — NEVER include accessTokenEncrypted
    return {
      phoneNumberId: config.phoneNumberId,
      displayPhone: config.displayPhone,
      verifiedName: config.verifiedName ?? undefined,
      activo: config.activo,
    };
  }

  /**
   * Returns WABA configuration for a professional (safe fields only).
   * SECURITY: accessTokenEncrypted is explicitly excluded via select.
   */
  async getWabaConfig(
    profesionalId: string,
  ): Promise<WabaConfigResponseDto | null> {
    const config = await this.prisma.configuracionWABA.findUnique({
      where: { profesionalId },
      // IMPORTANT: Do NOT select accessTokenEncrypted
      select: {
        phoneNumberId: true,
        displayPhone: true,
        verifiedName: true,
        activo: true,
      },
    });
    if (!config) return null;
    return {
      phoneNumberId: config.phoneNumberId,
      displayPhone: config.displayPhone,
      verifiedName: config.verifiedName ?? undefined,
      activo: config.activo,
    };
  }

  /**
   * Fetches and decrypts WABA config for a professional.
   * Throws NotFoundException if not configured.
   */
  private async getDecryptedConfig(profesionalId: string): Promise<{
    phoneNumberId: string;
    accessToken: string;
    wabaId: string | null;
    displayPhone: string;
  }> {
    const config = await this.prisma.configuracionWABA.findUnique({
      where: { profesionalId },
    });
    if (!config) {
      throw new NotFoundException(
        'WABA no configurado para este profesional. Configure las credenciales en Ajustes > WhatsApp.',
      );
    }
    const accessToken = this.encryptionService.decrypt(
      config.accessTokenEncrypted,
    );
    return {
      phoneNumberId: config.phoneNumberId,
      accessToken,
      wabaId: config.wabaId ?? null,
      displayPhone: config.displayPhone,
    };
  }

  /**
   * Sends a WhatsApp template message.
   * Creates MensajeWhatsApp DB record, enqueues the send job.
   * Returns the DB record id (not waMessageId which is set after Meta response).
   */
  async sendTemplateMessage(
    profesionalId: string,
    dto: SendWaMessageDto,
  ): Promise<{ mensajeId: string; enqueued: boolean }> {
    const config = await this.getDecryptedConfig(profesionalId);

    // Check opt-in
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: dto.pacienteId },
      select: { telefono: true, whatsappOptIn: true },
    });
    if (!paciente) {
      throw new NotFoundException('Paciente no encontrado');
    }
    if (!paciente.whatsappOptIn) {
      throw new BadRequestException(
        'El paciente no ha dado su consentimiento para recibir mensajes de WhatsApp.',
      );
    }

    // Create pending DB record
    const mensaje = await this.prisma.mensajeWhatsApp.create({
      data: {
        pacienteId: dto.pacienteId,
        profesionalId,
        tipo: dto.tipo,
        contenido: dto.templateName,
        estado: 'PENDIENTE',
        direccion: 'OUTBOUND',
      },
    });

    // Enqueue send job — processor will call Meta API and update estado
    await this.whatsappQueue.add(
      'send-whatsapp-message',
      {
        mensajeId: mensaje.id,
        templateName: dto.templateName,
        languageCode: dto.languageCode ?? 'es',
        components: dto.components ?? [],
        phoneNumberId: config.phoneNumberId,
        accessToken: config.accessToken,
        telefono: paciente.telefono,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
    );

    return { mensajeId: mensaje.id, enqueued: true };
  }

  /**
   * Sends a free-text WhatsApp message (requires 24h conversation window to be open).
   * tipo=CUSTOM. Meta will reject if no open window.
   */
  async sendFreeText(
    profesionalId: string,
    pacienteId: string,
    texto: string,
  ): Promise<{ mensajeId: string; enqueued: boolean }> {
    const config = await this.getDecryptedConfig(profesionalId);

    const paciente = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { telefono: true, whatsappOptIn: true },
    });
    if (!paciente) {
      throw new NotFoundException('Paciente no encontrado');
    }
    if (!paciente.whatsappOptIn) {
      throw new BadRequestException(
        'El paciente no ha dado su consentimiento para recibir mensajes de WhatsApp.',
      );
    }

    const mensaje = await this.prisma.mensajeWhatsApp.create({
      data: {
        pacienteId,
        profesionalId,
        tipo: 'CUSTOM',
        contenido: texto,
        estado: 'PENDIENTE',
        direccion: 'OUTBOUND',
      },
    });

    await this.whatsappQueue.add(
      'send-whatsapp-message',
      {
        mensajeId: mensaje.id,
        freeText: texto,
        phoneNumberId: config.phoneNumberId,
        accessToken: config.accessToken,
        telefono: paciente.telefono,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
    );

    return { mensajeId: mensaje.id, enqueued: true };
  }

  /**
   * Sends a presupuesto PDF as a WhatsApp document message.
   * tipo=PRESUPUESTO. Uses the public PDF URL so Meta can fetch it.
   */
  async sendPresupuestoPdf(
    profesionalId: string,
    pacienteId: string,
    presupuestoId: string,
    pdfPublicUrl: string,
  ): Promise<{ mensajeId: string; enqueued: boolean }> {
    const config = await this.getDecryptedConfig(profesionalId);

    const paciente = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { telefono: true, whatsappOptIn: true },
    });
    if (!paciente) {
      throw new NotFoundException('Paciente no encontrado');
    }
    if (!paciente.whatsappOptIn) {
      throw new BadRequestException(
        'El paciente no ha dado su consentimiento para recibir mensajes de WhatsApp.',
      );
    }

    const mensaje = await this.prisma.mensajeWhatsApp.create({
      data: {
        pacienteId,
        profesionalId,
        tipo: 'PRESUPUESTO',
        contenido: `Presupuesto PDF: ${presupuestoId}`,
        estado: 'PENDIENTE',
        direccion: 'OUTBOUND',
      },
    });

    await this.whatsappQueue.add(
      'send-whatsapp-message',
      {
        mensajeId: mensaje.id,
        documentUrl: pdfPublicUrl,
        documentFilename: `presupuesto-${presupuestoId}.pdf`,
        phoneNumberId: config.phoneNumberId,
        accessToken: config.accessToken,
        telefono: paciente.telefono,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
    );

    return { mensajeId: mensaje.id, enqueued: true };
  }

  /**
   * Lists approved WhatsApp templates from Meta Business API.
   * Requires wabaId to be configured.
   */
  async listApprovedTemplates(profesionalId: string): Promise<any[]> {
    const config = await this.getDecryptedConfig(profesionalId);
    if (!config.wabaId) {
      throw new BadRequestException(
        'WABA ID no configurado. Complete la configuración de WhatsApp para listar templates.',
      );
    }

    const url = `${this.META_GRAPH_URL}/${this.META_API_VERSION}/${config.wabaId}/message_templates`;
    try {
      const response = await axios.get(url, {
        params: {
          status: 'APPROVED',
          fields: 'name,language,status,components',
        },
        headers: { Authorization: `Bearer ${config.accessToken}` },
      });
      return (response.data.data as any[]) ?? [];
    } catch (err: any) {
      const metaMsg =
        err.response?.data?.error?.message ?? 'Error al obtener templates';
      throw new BadRequestException(`Meta API: ${metaMsg}`);
    }
  }

  /**
   * Returns the full message thread for a patient (ordered by createdAt asc).
   * Includes direccion field for frontend bubble direction rendering.
   */
  async getMessageThread(
    profesionalId: string,
    pacienteId: string,
  ): Promise<any[]> {
    return this.prisma.mensajeWhatsApp.findMany({
      where: { pacienteId, profesionalId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Resets a failed message to PENDIENTE and re-enqueues the send job.
   * Verifies ownership before re-queuing.
   */
  async retryMessage(
    profesionalId: string,
    mensajeId: string,
  ): Promise<{ mensajeId: string; enqueued: boolean }> {
    const config = await this.getDecryptedConfig(profesionalId);

    // Verify ownership
    const mensaje = await this.prisma.mensajeWhatsApp.findUnique({
      where: { id: mensajeId },
      include: {
        paciente: { select: { telefono: true } },
      },
    });
    if (!mensaje || mensaje.profesionalId !== profesionalId) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    // Reset to PENDIENTE
    await this.prisma.mensajeWhatsApp.update({
      where: { id: mensajeId },
      data: { estado: 'PENDIENTE', errorMsg: null },
    });

    // Re-enqueue — processor will read contenido for templateName or freeText
    await this.whatsappQueue.add(
      'send-whatsapp-message',
      {
        mensajeId,
        phoneNumberId: config.phoneNumberId,
        accessToken: config.accessToken,
        telefono: mensaje.paciente.telefono,
        // Processor will determine message type from DB record
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
    );

    return { mensajeId, enqueued: true };
  }
}

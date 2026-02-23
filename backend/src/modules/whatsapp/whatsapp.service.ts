import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from './crypto/encryption.service';
import { WHATSAPP_QUEUE } from './processors/whatsapp-message.processor';
import { SaveWabaConfigDto } from './dto/save-waba-config.dto';
import { WabaConfigResponseDto } from './dto/waba-config-response.dto';

@Injectable()
export class WhatsappService {
  // Parameterized Meta API version — update here when Meta deprecates older versions
  private readonly META_API_VERSION = 'v21.0';

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
    const url = `https://graph.facebook.com/${this.META_API_VERSION}/${phoneNumberId}`;
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
}

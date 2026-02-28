import { Injectable, Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import axios from 'axios';
import { PrismaService } from '../../../prisma/prisma.service';

export const WHATSAPP_QUEUE = 'whatsapp-messages';

const META_GRAPH_URL = 'https://graph.facebook.com';
const META_API_VERSION = 'v21.0';

@Injectable()
@Processor(WHATSAPP_QUEUE)
export class WhatsappMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappMessageProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'send-whatsapp-message':
        await this.handleSendWhatsappMessage(job);
        break;

      case 'process-webhook':
        await this.handleProcessWebhook(job);
        break;

      case 'test-job':
        this.logger.log(
          `[Smoke test] test-job procesado: ${JSON.stringify(job.data)}`,
        );
        break;

      default:
        throw new Error(`Job desconocido: ${job.name}`);
    }
  }

  /**
   * Calls Meta Graph API to send a WhatsApp message.
   * Updates MensajeWhatsApp estado on success/failure.
   * job.data shape:
   *   - mensajeId: string (DB record)
   *   - phoneNumberId: string
   *   - accessToken: string
   *   - telefono: string (paciente phone)
   *   - templateName?: string (for template messages)
   *   - languageCode?: string (default 'es')
   *   - components?: object[]
   *   - freeText?: string (for free text messages)
   *   - documentUrl?: string (for document messages)
   *   - documentFilename?: string
   */
  private async handleSendWhatsappMessage(job: Job): Promise<void> {
    const {
      mensajeId,
      phoneNumberId,
      accessToken,
      telefono,
      templateName,
      languageCode = 'es',
      components = [],
      freeText,
      documentUrl,
      documentFilename,
    } = job.data as {
      mensajeId: string;
      phoneNumberId: string;
      accessToken: string;
      telefono: string;
      templateName?: string;
      languageCode?: string;
      components?: object[];
      freeText?: string;
      documentUrl?: string;
      documentFilename?: string;
    };

    // Check DB estado — skip if already processed (idempotency)
    const mensaje = await this.prisma.mensajeWhatsApp.findUnique({
      where: { id: mensajeId },
    });
    if (!mensaje) {
      this.logger.warn(`MensajeWhatsApp ${mensajeId} not found — skipping`);
      return;
    }
    if (mensaje.estado !== 'PENDIENTE') {
      this.logger.log(
        `MensajeWhatsApp ${mensajeId} estado=${mensaje.estado} — already processed, skipping`,
      );
      return;
    }

    // Normalize phone: strip non-digits (Meta requires E.164 without '+')
    const to = telefono.replace(/\D/g, '');

    const url = `${META_GRAPH_URL}/${META_API_VERSION}/${phoneNumberId}/messages`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    let messagePayload: object;

    if (documentUrl) {
      // Document message (PDF presupuesto)
      messagePayload = {
        messaging_product: 'whatsapp',
        to,
        type: 'document',
        document: {
          link: documentUrl,
          filename: documentFilename ?? 'presupuesto.pdf',
        },
      };
    } else if (freeText) {
      // Free text message
      messagePayload = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: freeText },
      };
    } else if (templateName) {
      // Template message
      messagePayload = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      };
    } else {
      // Fallback: try to use contenido as template name (retry case)
      messagePayload = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: mensaje.contenido ?? '',
          language: { code: 'es' },
          components: [],
        },
      };
    }

    try {
      const res = await axios.post(url, messagePayload, { headers });
      const waMessageId = res.data?.messages?.[0]?.id as string | undefined;

      await this.prisma.mensajeWhatsApp.update({
        where: { id: mensajeId },
        data: {
          estado: 'ENVIADO',
          waMessageId: waMessageId ?? null,
          sentAt: new Date(),
        },
      });

      this.logger.log(
        `MensajeWhatsApp ${mensajeId} enviado — waMessageId: ${waMessageId}`,
      );
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error?.message ??
        err.message ??
        'Error desconocido al enviar';

      await this.prisma.mensajeWhatsApp.update({
        where: { id: mensajeId },
        data: { estado: 'FALLIDO', errorMsg },
      });

      this.logger.error(
        `MensajeWhatsApp ${mensajeId} falló: ${errorMsg}`,
      );
      // Re-throw so BullMQ retries with backoff
      throw new Error(`Meta API error: ${errorMsg}`);
    }
  }

  /**
   * Processes Meta webhook events (status updates + inbound messages).
   * job.data = raw Meta webhook body.
   *
   * Status updates: update MensajeWhatsApp.estado by waMessageId
   * Inbound messages: create MensajeWhatsApp + ContactoLog + heat temperatura to CALIENTE
   */
  private async handleProcessWebhook(job: Job): Promise<void> {
    const body = job.data as any;

    try {
      const value =
        body?.entry?.[0]?.changes?.[0]?.value;

      if (!value) {
        this.logger.warn('Webhook body has no value — ignoring');
        return;
      }

      // Handle status updates (DELIVERED, READ, FAILED, etc.)
      if (value.statuses && Array.isArray(value.statuses)) {
        for (const status of value.statuses) {
          const waMessageId = status.id as string;
          const metaStatus = status.status as string;

          let estado: string | null = null;
          let extraData: Record<string, any> = {};

          switch (metaStatus) {
            case 'sent':
              estado = 'ENVIADO';
              extraData = { sentAt: new Date() };
              break;
            case 'delivered':
              estado = 'ENTREGADO';
              extraData = { deliveredAt: new Date() };
              break;
            case 'read':
              estado = 'LEIDO';
              extraData = { readAt: new Date() };
              break;
            case 'failed':
              estado = 'FALLIDO';
              extraData = {
                errorMsg: status.errors?.[0]?.message ?? 'Delivery failed',
              };
              break;
            default:
              this.logger.log(
                `Webhook: unknown status '${metaStatus}' for waMessageId=${waMessageId}`,
              );
          }

          if (estado && waMessageId) {
            await this.prisma.mensajeWhatsApp.updateMany({
              where: { waMessageId },
              data: { estado: estado as any, ...extraData },
            });
            this.logger.log(
              `Webhook: waMessageId=${waMessageId} → estado=${estado}`,
            );
          }
        }
      }

      // Handle inbound messages from patient
      if (value.messages && Array.isArray(value.messages)) {
        for (const msg of value.messages) {
          const from = msg.from as string; // Patient's phone (E.164 no '+')
          const waMessageId = msg.id as string;
          const textBody = msg.text?.body as string | undefined;
          const contenido = textBody ?? '[media]';

          // Find paciente by partial phone match (last 8 digits for robustness)
          const last8 = from.slice(-8);
          const paciente = await this.prisma.paciente.findFirst({
            where: { telefono: { contains: last8 } },
          });

          if (!paciente) {
            this.logger.warn(
              `Webhook inbound: no paciente found for phone suffix ${last8} (from: ${from})`,
            );
            continue;
          }

          const profesionalId = paciente.profesionalId;
          if (!profesionalId) {
            this.logger.warn(
              `Webhook inbound: paciente ${paciente.id} has no profesionalId — skipping`,
            );
            continue;
          }

          // 1. Create inbound MensajeWhatsApp
          await this.prisma.mensajeWhatsApp.create({
            data: {
              pacienteId: paciente.id,
              profesionalId,
              waMessageId,
              tipo: 'CUSTOM',
              contenido,
              estado: 'ENTREGADO',
              direccion: 'INBOUND',
            },
          });

          // 2. Create ContactoLog
          await this.prisma.contactoLog.create({
            data: {
              pacienteId: paciente.id,
              profesionalId,
              tipo: 'MENSAJE',
              nota: `WhatsApp inbound: ${contenido.slice(0, 100)}`,
            },
          });

          // 3. Auto-heat temperatura to CALIENTE (CRM-05)
          await this.prisma.paciente.update({
            where: { id: paciente.id },
            data: { temperatura: 'CALIENTE' },
          });

          this.logger.log(
            `Webhook inbound: paciente ${paciente.id} → MensajeWhatsApp created, temperatura=CALIENTE`,
          );
        }
      }
    } catch (err: any) {
      this.logger.error(`process-webhook error: ${err.message}`, err.stack);
      throw err; // Let BullMQ retry
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job): void {
    this.logger.error(`Job ${job.id} falló: ${job.failedReason}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`Job ${job.id} completado`);
  }
}

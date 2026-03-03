import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { WhatsappMessageProcessor, WHATSAPP_QUEUE } from './processors/whatsapp-message.processor';
import { EncryptionService } from './crypto/encryption.service';
import { WhatsappHmacGuard } from './guards/whatsapp-hmac.guard';

@Module({
  imports: [
    BullModule.registerQueue({ name: WHATSAPP_QUEUE }),
    // PrismaModule is @Global() — PrismaService is available without explicit import
  ],
  providers: [WhatsappService, WhatsappMessageProcessor, EncryptionService, WhatsappHmacGuard],
  controllers: [WhatsappController, WhatsappWebhookController],
  // Export BullModule so other modules (Phase 4) can inject the queue
  exports: [BullModule, WhatsappService, EncryptionService],
})
export class WhatsappModule {}

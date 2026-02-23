import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappMessageProcessor, WHATSAPP_QUEUE } from './processors/whatsapp-message.processor';
import { EncryptionService } from './crypto/encryption.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: WHATSAPP_QUEUE }),
  ],
  providers: [WhatsappService, WhatsappMessageProcessor, EncryptionService],
  controllers: [WhatsappController],
  // Export BullModule so other modules (Phase 4) can inject the queue
  exports: [BullModule, WhatsappService, EncryptionService],
})
export class WhatsappModule {}

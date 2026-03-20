import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AfipConfigModule } from '../afip-config/afip-config.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../whatsapp/crypto/encryption.service';
import { WsaaService } from './wsaa.service';
import { WsaaStubService } from './wsaa-stub.service';
import { WSAA_REDIS_CLIENT, WSAA_SERVICE } from './wsaa.constants';

@Module({
  imports: [
    AfipConfigModule,
    WhatsappModule,
    // PrismaModule is @Global() — PrismaService available without explicit import
    // ConfigModule is isGlobal: true — ConfigService available without explicit import
  ],
  providers: [
    WsaaService,
    WsaaStubService,
    {
      provide: WSAA_REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis | null => {
        if (config.get<string>('USE_AFIP_STUB') === 'true') {
          return null;
        }
        return new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          // Lazy connect — don't block startup if Redis is temporarily unavailable
          lazyConnect: true,
          enableOfflineQueue: false,
        });
      },
    },
    {
      provide: WSAA_SERVICE,
      inject: [ConfigService, PrismaService, EncryptionService, WSAA_REDIS_CLIENT],
      useFactory: (
        config: ConfigService,
        prisma: PrismaService,
        encryption: EncryptionService,
        redisClient: Redis | null,
      ) => {
        if (config.get<string>('USE_AFIP_STUB') === 'true') {
          return new WsaaStubService();
        }
        return new WsaaService(prisma, encryption, config, redisClient);
      },
    },
  ],
  exports: [WSAA_SERVICE],
})
export class WsaaModule {}

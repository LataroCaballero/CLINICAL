import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const poolSize = parseInt(process.env.DB_POOL_SIZE ?? '10', 10);
    let dbUrl = process.env.DATABASE_URL!;
    const sep = dbUrl.includes('?') ? '&' : '?';
    dbUrl += `${sep}connection_limit=${poolSize}&pool_timeout=30`;
    super({ datasources: { db: { url: dbUrl } } });
  }

  async onModuleInit() {
    this.logger.log('Connecting to database');
    await this.$connect();
    this.logger.log('Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

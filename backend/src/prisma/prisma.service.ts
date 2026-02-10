import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Force connection_limit=1 to prevent MaxClientsInSessionMode with pgBouncer
    let dbUrl = process.env.DATABASE_URL!;

    // Remove any existing connection_limit or pool_timeout
    dbUrl = dbUrl.replace(/[&?]connection_limit=\d+/g, '');
    dbUrl = dbUrl.replace(/[&?]pool_timeout=\d+/g, '');
    // Clean up malformed query string after removal
    dbUrl = dbUrl.replace(/\?&/, '?').replace(/[?&]$/, '');

    const separator = dbUrl.includes('?') ? '&' : '?';
    dbUrl += `${separator}connection_limit=1&pool_timeout=30`;

    super({ datasources: { db: { url: dbUrl } } });
  }

  async onModuleInit() {
    this.logger.log('Connecting to database (connection_limit=1, pool_timeout=30)');
    await this.$connect();
    this.logger.log('Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

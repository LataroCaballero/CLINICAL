import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

@Module({
  // PrismaModule is @Global() — not needed here; StorageService uses only node builtins
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}

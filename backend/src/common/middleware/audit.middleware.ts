import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const user = req.user || null;

    console.log({
      method: req.method,
      path: req.originalUrl,
      userId: user?.id || null,
      ip: req.ip,
      timestamp: new Date(),
    });

    next();
  }
}

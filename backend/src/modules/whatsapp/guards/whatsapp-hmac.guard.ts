import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class WhatsappHmacGuard implements CanActivate {
  private readonly logger = new Logger(WhatsappHmacGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RawBodyRequest<Request>>();

    const signature = request.headers['x-hub-signature-256'] as
      | string
      | undefined;
    const rawBody = request.rawBody;
    const appSecret = process.env.META_APP_SECRET;

    if (!appSecret) {
      this.logger.warn(
        'META_APP_SECRET not set — skipping HMAC verification (dev mode)',
      );
      return true;
    }

    if (!signature || !rawBody) {
      this.logger.warn('Missing x-hub-signature-256 or rawBody');
      throw new UnauthorizedException('Missing webhook signature');
    }

    const expected = `sha256=${crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex')}`;

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (sigBuffer.length !== expectedBuffer.length) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}

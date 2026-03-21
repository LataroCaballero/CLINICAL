import { Injectable } from '@nestjs/common';
import { AmbienteAFIP } from '@prisma/client';
import { AccessTicket, WsaaServiceInterface } from './wsaa.interfaces';

@Injectable()
export class WsaaStubService implements WsaaServiceInterface {
  async getTicket(
    _profesionalId: string,
    _service: string,
  ): Promise<AccessTicket> {
    return this.stubTicket();
  }

  async getTicketTransient(
    _certPem: string,
    _keyPem: string,
    _ambiente: AmbienteAFIP,
    _service: string,
  ): Promise<AccessTicket> {
    return this.stubTicket();
  }

  private stubTicket(): AccessTicket {
    return {
      token: 'stub-token',
      sign: 'stub-sign',
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    };
  }
}

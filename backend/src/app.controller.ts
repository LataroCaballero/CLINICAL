import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello() {
    return { message: 'API funcionando' };
  }
  @Get('/')
  health() {
    return {
      status: 'ok',
      service: 'clinical-backend',
      version: '1.0.0',
      timestamp: new Date(),
    };
  }
}

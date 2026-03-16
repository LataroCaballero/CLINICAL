import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { Auth } from '../auth/decorators/auth.decorator';
import { AfipConfigService } from './afip-config.service';
import { SaveCertDto } from './dto/save-cert.dto';
import { SaveBillingConfigDto } from './dto/save-billing-config.dto';

@Auth('ADMIN', 'PROFESIONAL')
@Controller('afip-config')
export class AfipConfigController {
  constructor(private readonly afipConfigService: AfipConfigService) {}

  @Get('status')
  getStatus(@Req() req: any) {
    return this.afipConfigService.getStatus(req.user.profesionalId);
  }

  @Post('cert')
  saveCert(@Req() req: any, @Body() dto: SaveCertDto) {
    return this.afipConfigService.saveCert(req.user.profesionalId, dto);
  }

  @Patch('billing')
  saveBillingConfig(@Req() req: any, @Body() dto: SaveBillingConfigDto) {
    return this.afipConfigService.saveBillingConfig(req.user.profesionalId, dto);
  }
}

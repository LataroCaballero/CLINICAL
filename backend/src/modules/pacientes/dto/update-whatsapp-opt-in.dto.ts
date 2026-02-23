import { IsBoolean } from 'class-validator';

export class UpdateWhatsappOptInDto {
  @IsBoolean()
  optIn: boolean;
}

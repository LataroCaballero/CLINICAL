import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SaveWabaConfigDto {
  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsOptional()
  wabaId?: string;
}

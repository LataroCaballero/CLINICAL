import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateEntryDto {
  @IsUUID()
  @IsString()
  templateId: string;

  @IsUUID()
  @IsString()
  templateVersionId: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;
}

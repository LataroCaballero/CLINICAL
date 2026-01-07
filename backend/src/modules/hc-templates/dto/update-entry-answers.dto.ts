import { IsObject, IsOptional } from 'class-validator';

export class UpdateEntryAnswersDto {
  @IsOptional()
  @IsObject()
  answers?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  computed?: Record<string, unknown>;
}

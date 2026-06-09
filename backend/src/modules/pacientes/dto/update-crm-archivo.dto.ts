import { IsBoolean } from 'class-validator';

export class UpdateCrmArchivoDto {
  @IsBoolean()
  archivado: boolean;
}

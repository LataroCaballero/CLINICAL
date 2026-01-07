import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TemplateSchemaDto {
  id: string;
  name: string;
  startNodeId: string;
  nodes: any[];
  edges: any[];
}

export class CreateVersionDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TemplateSchemaDto)
  schema?: TemplateSchemaDto;
}

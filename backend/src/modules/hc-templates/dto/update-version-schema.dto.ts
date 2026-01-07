import { IsObject, IsNotEmpty } from 'class-validator';

export class UpdateVersionSchemaDto {
  @IsObject()
  @IsNotEmpty()
  schema: {
    id: string;
    name: string;
    startNodeId: string;
    nodes: any[];
    edges: any[];
  };
}

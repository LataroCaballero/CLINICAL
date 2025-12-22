import { IsISO8601 } from 'class-validator';

export class ReprogramarTurnoDto {
  @IsISO8601()
  inicio!: string;

  @IsISO8601()
  fin!: string;
}

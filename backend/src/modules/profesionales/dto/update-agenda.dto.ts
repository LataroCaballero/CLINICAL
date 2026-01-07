import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

// Bloque de horario (ej: 09:00 - 13:00)
class BloqueHorario {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'inicio debe tener formato HH:mm',
  })
  inicio: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'fin debe tener formato HH:mm',
  })
  fin: string;
}

// Configuración de un día de la semana
class DiaSemana {
  @IsBoolean()
  activo: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BloqueHorario)
  bloques: BloqueHorario[];
}

// Día bloqueado (vacaciones, feriado, etc.)
class DiaBloqueado {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fecha debe tener formato YYYY-MM-DD',
  })
  fecha: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fechaFin debe tener formato YYYY-MM-DD',
  })
  fechaFin?: string;

  @IsString()
  motivo: string;
}

// Día de cirugía con horario específico
class DiaCirugia {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fecha debe tener formato YYYY-MM-DD',
  })
  fecha: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'inicio debe tener formato HH:mm',
  })
  inicio: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'fin debe tener formato HH:mm',
  })
  fin: string;
}

export class UpdateAgendaDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DiaSemana)
  horariosTrabajo?: Record<number, DiaSemana>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiaBloqueado)
  diasBloqueados?: DiaBloqueado[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiaCirugia)
  diasCirugia?: DiaCirugia[];
}

// Tipo exportado para uso en otros módulos
export type AgendaConfig = {
  horariosTrabajo: Record<
    number,
    {
      activo: boolean;
      bloques: Array<{ inicio: string; fin: string }>;
    }
  >;
  diasBloqueados: Array<{
    fecha: string;
    fechaFin?: string;
    motivo: string;
  }>;
  diasCirugia: Array<{
    fecha: string;
    inicio: string;
    fin: string;
  }>;
};

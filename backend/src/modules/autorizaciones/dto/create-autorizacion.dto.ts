export class CodigoPracticaDto {
  codigo: string;
  descripcion: string;
  monto?: number;
  coseguro?: number;
}

export class CreateAutorizacionDto {
  pacienteId: string;
  obraSocialId: string;
  codigos: CodigoPracticaDto[];
  profesionalId?: string; // requerido para SECRETARIA/ADMIN; ignorado si el JWT ya lo aporta
}

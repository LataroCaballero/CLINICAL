export type Modulo = 'turnos' | 'finanzas' | 'stock';
export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AlertaItem {
  tipo: string;
  count: number;
}

export interface AlertaModulo {
  modulo: Modulo;
  count: number;
  severity: Severity;
  mensaje: string;
  detalle?: { items: AlertaItem[] };
}

export interface AlertasResumenDto {
  timestamp: string;
  alertas: AlertaModulo[];
  totalCount: number;
}

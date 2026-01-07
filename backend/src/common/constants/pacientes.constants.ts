import { EstadoPaciente } from '@prisma/client';

export const ESTADO_PRIORITY: Record<EstadoPaciente, number> = {
  QUIRURGICO: 1,
  PRESUPUESTO: 2,
  PRIMERA: 3,
  PRACTICA_CONSULTORIO: 4,
  ACTIVO: 5,
  ARCHIVADO: 6,
};

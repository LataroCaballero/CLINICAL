import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DiagnosticoDto {
  zonas: string[];
  subzonas: string[];
  otroTexto?: string;
}

export interface TratamientoItemDto {
  nombre: string;
  tratamientoId?: string;
  precio: number;
}

export type TipoEntrada = 'primera_vez' | 'pre_quirurgico' | 'control' | 'practica' | 'libre';

export interface CodigoPracticaEntradaDto {
  codigo: string;
  descripcion: string;
  monto?: number;
  coseguro?: number;
}

export interface AutorizacionEntradaDto {
  obraSocialId: string;
  codigos: CodigoPracticaEntradaDto[];
}

export interface CreateEntradaDto {
  tipo: TipoEntrada;
  // primera_vez
  diagnostico?: DiagnosticoDto;
  tratamientos?: TratamientoItemDto[];
  comentario?: string;
  presupuestoId?: string;
  presupuestoTotal?: number;
  autorizaciones?: AutorizacionEntradaDto[];
  // tipos libres
  texto?: string;
  // fecha retroactiva (YYYY-MM-DD)
  fecha?: string;
}

export function useCreateHistoriaClinicaEntry() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pacienteId,
      dto,
    }: {
      pacienteId: string;
      dto: CreateEntradaDto;
    }) => {
      const { data } = await api.post(
        `/pacientes/${pacienteId}/historia-clinica/entradas`,
        dto,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['historia-clinica', variables.pacienteId] });
      qc.invalidateQueries({ queryKey: ['paciente', variables.pacienteId] });
      qc.invalidateQueries({ queryKey: ['pacientes'] });
      // Refrescar contactos (la HC puede crear ContactoLog de sistema)
      qc.invalidateQueries({ queryKey: ['contactos', variables.pacienteId] });
      // Refrescar kanban y autorizaciones si se crearon inline
      qc.invalidateQueries({ queryKey: ['crm-kanban'] });
      qc.invalidateQueries({ queryKey: ['autorizaciones'] });
    },
  });
}

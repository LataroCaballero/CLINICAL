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

/** Selección de una zona en el formulario de primera consulta (v1.9) */
export interface ZonaSeleccionDto {
  zonaId: string;           // ZonaHC.id
  zona: string;             // nombre snapshot, ej. "Abdomen"
  diagnosticos: string[];   // nombres de diagnósticos seleccionados
  otroTexto?: string;       // texto libre cuando la zona es "Otros"
  tratamientos: TratamientoItemDto[]; // { nombre, tratamientoId?, precio }
}

export type TipoEntrada = 'primera_vez' | 'pre_quirurgico' | 'control' | 'practica' | 'tratamiento_en_consultorio' | 'libre';

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
  // Clasificación clínica (Phase 41) — distinto del `tipo` de plantilla
  tipoEntrada?: 'CONSULTA_CIRUGIA' | 'TRATAMIENTO' | 'CONTROL' | 'SEGUIMIENTO' | 'PREOPERATORIO';
  // primera_vez (legacy — se mantiene para auto-guardado de borrador en LiveTurnoFooter)
  diagnostico?: DiagnosticoDto;
  tratamientos?: TratamientoItemDto[];
  // primera_vez (v1.9 — zona-céntrico)
  zonas?: ZonaSeleccionDto[];
  comentario?: string;
  presupuestoId?: string;
  presupuestoTotal?: number;
  autorizaciones?: AutorizacionEntradaDto[];
  // tipos libres
  texto?: string;
  // fecha retroactiva (YYYY-MM-DD)
  fecha?: string;
  // tratamiento_en_consultorio
  tratamientoIds?: string[];   // IDs of selected catalog treatments
  consumirInsumos?: boolean;   // Whether to create OrdenConsumo on save
  turnoId?: string;            // Present from LiveTurno, absent from PatientDrawer
}

export type TipoEntradaHCValue = NonNullable<CreateEntradaDto['tipoEntrada']>;

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
      // Refrescar columna "Último tratamiento" en TratamientosTab
      qc.invalidateQueries({ queryKey: ['turnos', 'rango'] });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useLiveTurnoStore, LiveTurnoSession } from '@/store/live-turno.store';
import { toast } from 'sonner';

interface IniciarSesionResponse {
  id: string;
  inicioReal: string;
  inicio: string;
  paciente: {
    id: string;
    nombreCompleto: string;
    telefono?: string;
    email?: string;
    plan?: string; // String field, not a relation
    obraSocial?: { id: string; nombre: string };
  };
  profesional: {
    id: string;
    usuario: { nombre: string; apellido: string };
  };
  tipoTurno: {
    id: string;
    nombre: string;
  };
}

interface CerrarSesionDto {
  finReal?: string;
  entradaHCId?: string;
}

export function useLiveTurnoActions() {
  const qc = useQueryClient();
  const { startSession, endSession, session } = useLiveTurnoStore();

  const iniciarSesion = useMutation({
    mutationFn: async (turnoId: string) => {
      const { data } = await api.post<IniciarSesionResponse>(
        `/turnos/${turnoId}/iniciar-sesion`,
        {} // Send empty body to avoid validation issues
      );
      return data;
    },
    onSuccess: (data) => {
      const sessionData: LiveTurnoSession = {
        turnoId: data.id,
        pacienteId: data.paciente.id,
        pacienteNombre: data.paciente.nombreCompleto,
        pacienteTelefono: data.paciente.telefono,
        pacienteEmail: data.paciente.email,
        pacienteObraSocial: data.paciente.obraSocial?.nombre,
        pacientePlan: data.paciente.plan,
        profesionalId: data.profesional.id,
        tipoTurno: data.tipoTurno.nombre,
        tipoTurnoId: data.tipoTurno.id,
        startedAt: data.inicioReal,
        scheduledStart: data.inicio,
      };
      startSession(sessionData);
      qc.invalidateQueries({ queryKey: ['turnos'] });
      toast.success('Sesion iniciada');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Error al iniciar sesion';
      toast.error(message);
      console.error('Error iniciando sesion:', error);
    },
  });

  const cerrarSesion = useMutation({
    mutationFn: async (dto?: CerrarSesionDto) => {
      if (!session) throw new Error('No hay sesion activa');
      const { data } = await api.patch(
        `/turnos/${session.turnoId}/cerrar-sesion`,
        dto || {}
      );
      return data;
    },
    onSuccess: () => {
      endSession();
      qc.invalidateQueries({ queryKey: ['turnos'] });
      toast.success('Sesion finalizada');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Error al cerrar sesion';
      toast.error(message);
    },
  });

  // Cerrar sesión por turnoId (para cuando no hay sesión en el store)
  const cerrarSesionPorId = useMutation({
    mutationFn: async (turnoId: string) => {
      const { data } = await api.patch(
        `/turnos/${turnoId}/cerrar-sesion`,
        {}
      );
      return data;
    },
    onSuccess: () => {
      endSession();
      qc.invalidateQueries({ queryKey: ['turnos'] });
      toast.success('Sesion anterior finalizada');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Error al cerrar sesion';
      toast.error(message);
    },
  });

  return { iniciarSesion, cerrarSesion, cerrarSesionPorId };
}

// Hook to check for active session on server (for sync)
export function useSesionActiva(profesionalId: string | null) {
  return useQuery({
    queryKey: ['turnos', 'sesion-activa', profesionalId],
    queryFn: async () => {
      if (!profesionalId) return null;
      const { data } = await api.get(
        `/turnos/sesion-activa?profesionalId=${profesionalId}`
      );
      return data;
    },
    enabled: !!profesionalId,
    staleTime: 30000, // 30 seconds
  });
}

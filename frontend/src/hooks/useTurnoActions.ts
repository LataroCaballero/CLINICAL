import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useTurnoActions(pacienteId: string) {
    const qc = useQueryClient();

    const onSuccess = () => {
        qc.invalidateQueries({ queryKey: ["turnos", "paciente", pacienteId] });
    };

    const cancelar = useMutation({
        mutationFn: (turnoId: string) =>
            api.patch(`/turnos/${turnoId}/cancelar`),
        onSuccess,
    });

    const finalizar = useMutation({
        mutationFn: (turnoId: string) =>
            api.patch(`/turnos/${turnoId}/finalizar`),
        onSuccess,
    });

    return { cancelar, finalizar };
}

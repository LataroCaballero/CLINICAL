import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePacienteTurnos } from "@/hooks/usePacienteTurnos";
import { useTurnoActions } from "@/hooks/useTurnoActions";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { NuevoTurnoModal } from "./NuevoTurnoModal";

type Props = {
    pacienteId: string;
    onBack: () => void;
};

export default function PacienteTurnos({ pacienteId, onBack }: Props) {
    const { data: turnos = [], isLoading } = usePacienteTurnos(pacienteId);
    const { cancelar, finalizar } = useTurnoActions(pacienteId);
    const [openNuevoTurno, setOpenNuevoTurno] = useState(false);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => onBack()}>
                    ← Volver
                </Button>
                <h2 className="text-lg font-semibold">Turnos</h2>
                <Button onClick={() => setOpenNuevoTurno(true)}>Nuevo turno</Button>
            </div>

            {/* Estado de carga */}
            {isLoading && <p>Cargando turnos...</p>}

            {/* Sin turnos */}
            {!isLoading && turnos.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    No hay turnos próximos.
                </p>
            )}

            {/* Listado */}
            <div className="space-y-3">
                {turnos.map((t: any) => {
                    const puedeAccionar =
                        t.estado !== "CANCELADO" && t.estado !== "FINALIZADO";

                    return (
                        <div
                            key={t.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                        >
                            <div>
                                <p className="font-medium">
                                    {t.tipoTurno.nombre} · {t.profesional.nombreCompleto}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {format(new Date(t.inicio), "dd/MM/yyyy HH:mm", {
                                        locale: es,
                                    })}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Badge>{t.estado}</Badge>

                                {puedeAccionar && (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => finalizar.mutate(t.id)}
                                        >
                                            Finalizar
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => cancelar.mutate(t.id)}
                                        >
                                            Cancelar
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal nuevo turno */}
            <NuevoTurnoModal
                open={openNuevoTurno}
                onOpenChange={setOpenNuevoTurno}
                pacienteId={pacienteId}
            />
        </div>
    );
}
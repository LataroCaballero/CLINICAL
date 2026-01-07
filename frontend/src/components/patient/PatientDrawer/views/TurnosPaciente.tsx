import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePacienteTurnos } from "@/hooks/usePacienteTurnos";
import { useTurnoActions } from "@/hooks/useTurnoActions";
import { useCobrarTurno } from "@/hooks/useCobrarTurno";
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
    const cobrarTurno = useCobrarTurno();
    const [openNuevoTurno, setOpenNuevoTurno] = useState(false);
    const [openCobrarModal, setOpenCobrarModal] = useState(false);
    const [selectedTurnoId, setSelectedTurnoId] = useState<string | null>(null);
    const [monto, setMonto] = useState("");
    const [descripcion, setDescripcion] = useState("");

    const handleOpenCobrar = (turnoId: string) => {
        setSelectedTurnoId(turnoId);
        setMonto("");
        setDescripcion("");
        setOpenCobrarModal(true);
    };

    const handleCobrar = async () => {
        if (!selectedTurnoId) return;
        const montoNum = parseFloat(monto);
        if (isNaN(montoNum) || montoNum <= 0) return;

        await cobrarTurno.mutateAsync({
            turnoId: selectedTurnoId,
            pacienteId,
            data: {
                monto: montoNum,
                descripcion: descripcion || undefined,
            },
        });

        setOpenCobrarModal(false);
        setSelectedTurnoId(null);
    };

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
                                    {t.tipoTurno?.nombre ?? "Sin tipo"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {format(new Date(t.inicio), "dd/MM/yyyy HH:mm", {
                                        locale: es,
                                    })}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Badge>{t.estado}</Badge>

                                {t.estado !== "CANCELADO" && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => handleOpenCobrar(t.id)}
                                    >
                                        Cobrar
                                    </Button>
                                )}

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

            {/* Modal cobrar turno */}
            <Dialog open={openCobrarModal} onOpenChange={setOpenCobrarModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cobrar Turno</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="monto-cobro">Monto</Label>
                            <Input
                                id="monto-cobro"
                                type="number"
                                placeholder="0.00"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="descripcion-cobro">
                                Descripcion (opcional)
                            </Label>
                            <Input
                                id="descripcion-cobro"
                                placeholder="Ej: Pago en efectivo"
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setOpenCobrarModal(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCobrar}
                            disabled={cobrarTurno.isPending || !monto}
                        >
                            {cobrarTurno.isPending ? "Cobrando..." : "Cobrar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTurnoSchema, CreateTurnoForm } from "@/schemas/createTurno.schema";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { useProfesionales } from "@/hooks/useProfesionales";
import { useTiposTurno } from "@/hooks/useTipoTurnos";

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    pacienteId: string;
};

export function NuevoTurnoModal({ open, onOpenChange, pacienteId }: Props) {
    const qc = useQueryClient();
    const { data: profesionales = [], isLoading: loadingProfesionales } =
        useProfesionales();
    const { data: tiposTurno = [], isLoading: loadingTipos } = useTiposTurno();

    const form = useForm<CreateTurnoForm>({
        resolver: zodResolver(createTurnoSchema),
        defaultValues: {
            inicio: "",
        },
    });

    const onSubmit = async (values: CreateTurnoForm) => {
        await api.post("/turnos", {
            ...values,
            pacienteId,
        });

        qc.invalidateQueries({ queryKey: ["turnos", "paciente", pacienteId] });
        onOpenChange(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nuevo turno</DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Profesional */}
                    <div className="space-y-1">
                        <Label>Profesional</Label>
                        <Select
                            onValueChange={(v) => form.setValue("profesionalId", v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar profesional" />
                            </SelectTrigger>
                            <SelectContent>
                                {loadingProfesionales && (
                                    <div className="flex justify-center p-2">
                                        <Loader2 className="animate-spin h-4 w-4" />
                                    </div>
                                )}
                                {profesionales.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.usuario?.nombre} {p.usuario?.apellido}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tipo de turno */}
                    <div className="space-y-1">
                        <Label>Tipo de turno</Label>
                        <Select
                            onValueChange={(v) => form.setValue("tipoTurnoId", v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar tipo de turno" />
                            </SelectTrigger>
                            <SelectContent>
                                {loadingTipos && (
                                    <div className="flex justify-center p-2">
                                        <Loader2 className="animate-spin h-4 w-4" />
                                    </div>
                                )}
                                {tiposTurno.map((t: any) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {t.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Fecha y hora */}
                    <div className="space-y-1">
                        <Label>Fecha y hora</Label>
                        <Input
                            type="datetime-local"
                            {...form.register("inicio")}
                        />
                    </div>

                    {/* Observaciones */}
                    <div className="space-y-1">
                        <Label>Observaciones</Label>
                        <Textarea
                            placeholder="Comentario interno (opcional)"
                            {...form.register("observaciones")}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={form.formState.isSubmitting}
                    >
                        {form.formState.isSubmitting && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Crear turno
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
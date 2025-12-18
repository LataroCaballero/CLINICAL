// HistoriaClinica.tsx – MVP conectado a backend

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Plus, FileText } from "lucide-react";

// Hooks (asumidos / a implementar)
// useHistoriaClinica(pacienteId) -> { data, isLoading, isError }
// useCreateHistoriaClinicaEntry() -> mutate({ pacienteId, contenido })
import { useHistoriaClinica } from "@/hooks/useHistoriaClinica";
import { useCreateHistoriaClinicaEntry } from "@/hooks/useCreateHistoriaClinicaEntry";
import { ArrowLeft } from "lucide-react";

interface Props {
    pacienteId: string;
    onBack: () => void;
}

export default function HistoriaClinica({ pacienteId, onBack }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [contenido, setContenido] = useState("");

    const { data: entradas = [], isLoading, isError } = useHistoriaClinica(pacienteId);
    const createEntry = useCreateHistoriaClinicaEntry();

    const handleGuardar = async () => {
        if (!contenido.trim()) return;

        await createEntry.mutateAsync({ pacienteId, contenido });
        setContenido("");
        setShowForm(false);
    };

    return (
        <div className="space-y-6 pb-6">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                        className="h-8 w-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>

                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="w-5 h-5" /> Historia clínica
                    </h3>
                </div>

                <Button size="sm" onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Nueva entrada
                </Button>
            </div>

            {/* FORM NUEVA ENTRADA */}
            {showForm && (
                <Card className="p-4 space-y-4">
                    <h4 className="font-medium">Nueva entrada</h4>
                    <Textarea
                        placeholder="Escribí la evolución, observaciones o indicaciones clínicas…"
                        value={contenido}
                        onChange={(e) => setContenido(e.target.value)}
                        rows={4}
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setShowForm(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleGuardar} disabled={createEntry.isPending}>
                            Guardar
                        </Button>
                    </div>
                </Card>
            )}

            <Separator />

            {/* LISTADO */}
            <div className="space-y-4">
                {isLoading && (
                    <p className="text-sm text-muted-foreground">Cargando historia clínica…</p>
                )}

                {isError && (
                    <p className="text-sm text-red-600">Error al cargar la historia clínica.</p>
                )}

                {!isLoading && entradas.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        Este paciente todavía no tiene entradas en su historia clínica.
                    </p>
                )}

                {entradas.map((entrada: any) => (
                    <Card key={entrada.id} className="p-4 space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>
                                {new Date(entrada.fecha).toLocaleDateString("es-AR")}
                            </span>
                            <span>{entrada.profesionalNombre || "Profesional"}</span>
                        </div>
                        <Separator />
                        <p className="text-sm whitespace-pre-line">
                            {entrada.contenido?.texto}
                        </p>
                    </Card>
                ))}
            </div>
        </div>
    );
}

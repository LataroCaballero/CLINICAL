"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandInput,
    CommandEmpty,
} from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDiagnosticos, useCreateDiagnostico, useDeleteDiagnostico } from "@/hooks/useDiagnosticos";
import { useQueryClient } from "@tanstack/react-query";

export function DiagnosticoCombobox({ value, onChange }: any) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [deleting, setDeleting] = useState<string | null>(null);

    const { data: diagnosticos = [] } = useDiagnosticos(query);
    const createMutation = useCreateDiagnostico();
    const deleteMutation = useDeleteDiagnostico();

    const qc = useQueryClient();

    const nombres = diagnosticos.map((d: any) => d.nombre);
    const exists = nombres.includes(query);

    // Crear diagnóstico
    const handleCreate = async () => {
        if (!query.trim()) return;
        const nuevo = await createMutation.mutateAsync(query.trim());
        onChange(nuevo.nombre);
        setOpen(false);
    };

    // Eliminar diagnóstico
    const handleDelete = async (id: string, nombre: string) => {
        setDeleting(id);

        setTimeout(async () => {
            await deleteMutation.mutateAsync(id);

            if (value === nombre) {
                onChange("");
            }

            qc.invalidateQueries({ queryKey: ["diagnosticos"] });
            setDeleting(null);
        }, 450);
    };

    return (
        <div className="w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                        {value || "Seleccionar diagnóstico"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-full p-0">
                    <Command
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                if (!exists) handleCreate();
                            }
                        }}
                    >
                        <CommandInput
                            placeholder="Buscar o crear diagnóstico..."
                            value={query}
                            onValueChange={setQuery}
                        />

                        {!exists && query && (
                            <CommandItem
                                className="flex items-center gap-2 cursor-pointer px-3 py-2"
                                onSelect={handleCreate}
                            >
                                <Plus className="h-4 w-4" />
                                Crear diagnóstico: "{query}"
                            </CommandItem>
                        )}

                        <CommandEmpty>No hay resultados</CommandEmpty>

                        <CommandGroup heading="Diagnósticos">
                            <AnimatePresence>
                                {diagnosticos.map((d: any) => {
                                    const isDeleting = deleting === d.id;

                                    return (
                                        <motion.div
                                            key={d.id}
                                            initial={{ opacity: 1, height: "auto" }}
                                            animate={{ scale: isDeleting ? 1.05 : 1 }}
                                            exit={{ opacity: 0, height: 0, margin: 0 }}
                                            transition={{ duration: 0.35 }}
                                            className="relative overflow-hidden rounded-md"
                                        >
                                            <CommandItem
                                                disabled={isDeleting}
                                                onSelect={() => {
                                                    onChange(d.nombre);
                                                    setOpen(false);
                                                }}
                                                className="flex items-center px-3 py-2 gap-2 cursor-pointer"
                                            >
                                                <span className="flex-1">{d.nombre}</span>

                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(d.id, d.nombre);
                                                    }}
                                                    className="p-1 bg-gray-200 hover:bg-red-500 text-gray-700 hover:text-white rounded-md transition"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </CommandItem>

                                            {isDeleting && (
                                                <motion.div
                                                    initial={{ scale: 0, opacity: 1 }}
                                                    animate={{ scale: 1.5, opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.45, ease: "easeInOut" }}
                                                    className="absolute inset-0 bg-red-600 flex items-center justify-center rounded-md z-20"
                                                >
                                                    <Trash2 className="h-5 w-5 text-white" />
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

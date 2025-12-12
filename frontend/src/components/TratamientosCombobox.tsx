"use client";

import { useState } from "react";
import {
    Command, CommandGroup, CommandItem, CommandInput, CommandEmpty
} from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTratamientos, useCreateTratamiento, useDeleteTratamiento } from "@/hooks/useTratamientos";
import { useQueryClient } from "@tanstack/react-query";

export function TratamientoCombobox({ value, onChange }: any) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [deleting, setDeleting] = useState<string | null>(null);

    const { data: tratamientos = [] } = useTratamientos(query);
    const createMutation = useCreateTratamiento();
    const deleteMutation = useDeleteTratamiento();
    const qc = useQueryClient();

    const nombres = tratamientos.map((t: any) => t.nombre);
    const exists = nombres.includes(query);

    const handleCreate = async () => {
        if (!query.trim()) return;
        const nuevo = await createMutation.mutateAsync(query.trim());
        onChange(nuevo.nombre);
        setOpen(false);
    };

    const handleDelete = async (id: string, nombre: string) => {
        setDeleting(id);
        setTimeout(async () => {
            await deleteMutation.mutateAsync(id);
            if (value === nombre) onChange("");
            qc.invalidateQueries({ queryKey: ["tratamientos"] });
            setDeleting(null);
        }, 450);
    };

    return (
        <div className="w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                        {value || "Seleccionar tratamiento"}
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
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
                            placeholder="Buscar o agregar tratamiento..."
                            value={query}
                            onValueChange={setQuery}
                        />

                        {!exists && query && (
                            <CommandItem onSelect={handleCreate} className="cursor-pointer flex gap-2 px-3 py-2">
                                <Plus className="h-4 w-4" />
                                Crear tratamiento: "{query}"
                            </CommandItem>
                        )}

                        <CommandEmpty>No hay resultados</CommandEmpty>

                        <CommandGroup>
                            <AnimatePresence>
                                {tratamientos.map((t: any) => {
                                    const isDeleting = deleting === t.id;

                                    return (
                                        <motion.div
                                            key={t.id}
                                            initial={{ opacity: 1, height: "auto" }}
                                            animate={{ scale: isDeleting ? 1.05 : 1 }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.35 }}
                                            className="relative rounded-md overflow-hidden"
                                        >
                                            <CommandItem
                                                disabled={isDeleting}
                                                onSelect={() => {
                                                    onChange(t.nombre);
                                                    setOpen(false);
                                                }}
                                                className="flex items-center px-3 py-2 gap-2"
                                            >
                                                <span className="flex-1">{t.nombre}</span>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(t.id, t.nombre);
                                                    }}
                                                    className="p-1 rounded bg-gray-200 hover:bg-red-500 hover:text-white"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </CommandItem>

                                            {isDeleting && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1.4, opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.45 }}
                                                    className="absolute inset-0 bg-red-600 flex items-center justify-center z-10"
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

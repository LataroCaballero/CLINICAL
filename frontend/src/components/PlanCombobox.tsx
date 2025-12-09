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
import { useCreatePlan } from "@/hooks/useCreatePlan";
import { useDeletePlan } from "@/hooks/useDeletePlan";
import { Check, ChevronsUpDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export function PlanCombobox({ planes, value, onChange, obraSocialId }: any) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [deleting, setDeleting] = useState<string | null>(null);
    const [hoverTrash, setHoverTrash] = useState<string | null>(null);

    const createPlanMutation = useCreatePlan();
    const deletePlanMutation = useDeletePlan();
    const queryClient = useQueryClient();

    const planNames = planes.map((p: any) => p.nombre);
    const isCustom = query && !planNames.includes(query);

    // Crear plan con Enter
    const handleEnter = async () => {
        if (!isCustom) return;

        const newPlan = await createPlanMutation.mutateAsync({
            obraSocialId,
            nombre: query,
        });

        onChange(newPlan.nombre);
        setOpen(false);
    };

    const handleDelete = async (planId: string) => {
        setDeleting(planId);

        setTimeout(async () => {
            await deletePlanMutation.mutateAsync(planId);

            // Borrar selección actual si coincide
            const deletedObj = planes.find((p: any) => p.id === planId);
            if (value === deletedObj?.nombre) onChange("");

            // Actualizar desde el cache automáticamente
            queryClient.invalidateQueries(["obrasSociales"]);

            const updated = queryClient.getQueryData(["obrasSociales"]);
            const os = updated?.find((o: any) => o.id === obraSocialId);

            setDeleting(null);

            setTimeout(() => {
                // actualizar planes
                if (os) {
                    // planes actualizados
                    const updatedOs = os.planes ?? [];
                    // actualiza el estado local
                    // esto tenés que pasarlo al componente padre si lo manejás allí
                }
            }, 50);
        }, 450);
    };

    const deleteButtonVariants = {
        initial: {
            width: "32px",   // ancho normal del boton
            backgroundColor: "rgb(239 68 68 / 0.1)", // rojo suave
            borderRadius: "6px",
        },
        expand: {
            width: "100%",
            backgroundColor: "rgb(220 38 38)", // rojo intenso
            borderRadius: "6px",
            transition: {
                type: "tween",
                duration: 0.35,
                ease: "easeInOut",
            },
        },
    };


    return (
        <div className="w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                        {value || "Seleccionar plan"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-full p-0">
                    <Command
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleEnter();
                            }
                        }}
                    >
                        <CommandInput
                            placeholder="Buscar o crear un plan..."
                            value={query}
                            onValueChange={setQuery}
                        />

                        <CommandEmpty>No existe. Presione Enter para crear.</CommandEmpty>

                        <CommandGroup heading="Planes disponibles">
                            <AnimatePresence>
                                {planes.map((p: any) => {
                                    const isDeleting = deleting === p.id;
                                    const isHovering = hoverTrash === p.id;

                                    return (
                                        <motion.div
                                            key={p.id}
                                            initial={{ opacity: 1, height: "auto" }}
                                            animate={{ scale: deleting === p.id ? 1.02 : 1 }}
                                            exit={{ opacity: 0, height: 0, margin: 0 }}
                                            transition={{ duration: 0.35 }}
                                            className="relative overflow-hidden rounded-md"
                                        >
                                            <CommandItem
                                                disabled={deleting === p.id}
                                                onSelect={(val) => {
                                                    if (deleting === p.id) return;
                                                    onChange(val);
                                                    setOpen(false);
                                                }}
                                                className="flex items-center px-3 py-2 gap-2"
                                            >
                                                <span className="flex-1">{p.nombre}</span>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(p.id);
                                                    }}
                                                    className="p-1 rounded bg-gray-200 text-gray-600 hover:bg-red-500 hover:text-white transition"
                                                >
                                                    <Trash2 className="h-4 w-4 hover:text-white" />
                                                </button>
                                            </CommandItem>

                                            {/* CAPA SUPERIOR ANIMADA */}
                                            {deleting === p.id && (
                                                <motion.div
                                                    initial={{ scale: 0, opacity: 1 }}
                                                    animate={{ scale: 1.5, opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                                    className="
        absolute inset-0 
        bg-red-600 
        flex items-center justify-center 
        rounded-md z-20
      "
                                                >
                                                    <Trash2 className="h-4 w-4 text-white" />
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

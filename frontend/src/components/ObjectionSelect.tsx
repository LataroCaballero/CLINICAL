"use client";

import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover";
import {
    Command,
    CommandInput,
    CommandList,
    CommandItem,
    CommandEmpty,
    CommandGroup
} from "@/components/ui/command";
import { ChevronDown } from "lucide-react";

import { useObjecionSuggest } from "@/hooks/useObjecionSuggest";
import axios from "@/lib/axios";
import { useState } from "react";

interface Objection {
    id: number | string;
    nombre: string;
    [key: string]: any;
}

interface ObjectionDropdownProps {
    pacienteId: number | string;
    value: Objection | null;
    onChange: (obj: Objection | null) => void;
}

export default function ObjectionSelect({ pacienteId, value, onChange }: ObjectionDropdownProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");

    const { data = [] } = useObjecionSuggest(query);

    // Seleccionar objeción existente
    const handleSelect = async (obj: Objection | null) => {
        await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/pacientes/${pacienteId}/objecion`, {
            objecionId: obj?.id ?? null,
        });

        onChange(obj);
        setOpen(false);
    };

    // Crear nueva objeción
    const handleCreate = async () => {
        const { data: created } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/pacientes/objeciones`,
            { nombre: query }
        );


        handleSelect(created);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                asChild
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <button
                    className="w-full flex items-center justify-between border rounded px-2 py-1 bg-white hover:bg-gray-50 text-sm"
                >
                    {value?.nombre || "Seleccionar..."}
                    <ChevronDown className="h-4 w-4 opacity-60" />
                </button>
            </PopoverTrigger>

            <PopoverContent
                className="p-0 w-64"
                onInteractOutside={(e) => e.stopPropagation()}
            >
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Buscar objeción..."
                        value={query}
                        onValueChange={setQuery}
                        onClick={(e) => e.stopPropagation()} // Muy importante
                    />

                    <CommandList>
                        <CommandEmpty>
                            {query.length === 0 ? (
                                <span className="text-gray-500 px-2 py-1 text-sm">
                                    Escribí para buscar
                                </span>
                            ) : (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCreate();
                                    }}
                                    className="text-blue-600 underline px-2 py-1 text-sm"
                                >
                                    Crear "{query}"
                                </button>
                            )}
                        </CommandEmpty>


                        <CommandGroup heading="Resultados">
                            {data.map((obj: { id: string | number; nombre: string }) => (
                                <CommandItem
                                    key={obj.id}
                                    value={obj.nombre}
                                    onSelect={() => handleSelect(obj)}
                                >
                                    {obj.nombre}
                                </CommandItem>

                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

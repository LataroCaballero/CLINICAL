"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Condiciones médicas comunes
const PREDEFINED = [
    "Hipertensión",
    "Diabetes",
    "Asma",
    "Enfermedad cardíaca",
    "Obesidad",
    "Artritis",
    "Alergia severa",
    "Hipotiroidismo",
    "Cannabis",
    "Epilepsia",
];

export function CondicionesChips({ value, onChange }: any) {
    const [customValue, setCustomValue] = useState("");

    // Convertimos string → array
    const selected: string[] = value
        ? value.split(",").map((v: string) => v.trim()).filter(Boolean)
        : [];

    // Unir predefinidas + seleccionadas del usuario
    const allChips = Array.from(new Set([...PREDEFINED, ...selected]));

    const toggle = (item: string) => {
        const newList = selected.includes(item)
            ? selected.filter((x) => x !== item)
            : [...selected, item];

        onChange(newList.join(", "));
    };

    const addCustom = () => {
        if (!customValue.trim()) return;

        const newList = Array.from(new Set([...selected, customValue.trim()]));

        onChange(newList.join(", "));
        setCustomValue("");
    };

    return (
        <div className="space-y-3">

            {/* LISTA DE CHIPS */}
            <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                    {allChips.map((item) => {
                        const active = selected.includes(item);

                        return (
                            <motion.div
                                key={item}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                <Badge
                                    variant="outline"
                                    onClick={() => toggle(item)}
                                    className={cn(
                                        "cursor-pointer px-3 py-1 rounded-full transition shadow-sm",
                                        active
                                            ? "bg-orange-600 text-white border-orange-600"
                                            : "hover:bg-orange-100 dark:hover:bg-orange-900"
                                    )}
                                >
                                    {item}
                                </Badge>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* AGREGAR PERSONALIZADA */}
            <div className="flex gap-2">
                <Input
                    placeholder="Agregar condición"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                />
                <button
                    type="button"
                    onClick={addCustom}
                    className="px-3 py-2 bg-orange-600 text-white rounded-md flex items-center"
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>

        </div>
    );
}

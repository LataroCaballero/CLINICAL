"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

// Parse ISO string → Date sin timezone bugs
function parseToDate(str?: string) {
    if (!str) return undefined;
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
}

// Convert Date → "YYYY-MM-DD"
function formatToIso(date?: Date) {
    if (!date) return undefined;
    return date.toISOString().split("T")[0];
}

export function BirthDatePicker({ value, onChange }: any) {
    const dateObj = parseToDate(value);
    const [open, setOpen] = useState(false);

    // Para controlar qué mes y año se muestran
    const [currentMonth, setCurrentMonth] = useState(dateObj || new Date());

    const years = Array.from({ length: 120 }, (_, i) => new Date().getFullYear() - i);
    const months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="justify-start text-left font-normal w-full"
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateObj
                        ? format(dateObj, "d 'de' MMMM, yyyy", { locale: es })
                        : "Seleccionar fecha"}
                </Button>
            </PopoverTrigger>

            <PopoverContent className="p-3">

                {/* CONTROLES DE MES Y AÑO */}
                <div className="flex items-center justify-between mb-2">

                    {/* BOTÓN MES ANTERIOR */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
                        }
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* SELECTOR DE MES */}
                    <select
                        className="bg-transparent text-sm rounded px-2 py-1"
                        value={currentMonth.getMonth()}
                        onChange={(e) =>
                            setCurrentMonth(
                                new Date(currentMonth.getFullYear(), Number(e.target.value), 1)
                            )
                        }
                    >
                        {months.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                        ))}
                    </select>

                    {/* SELECTOR DE AÑO */}
                    <select
                        className="bg-transparent text-sm rounded px-2 py-1"
                        value={currentMonth.getFullYear()}
                        onChange={(e) =>
                            setCurrentMonth(
                                new Date(Number(e.target.value), currentMonth.getMonth(), 1)
                            )
                        }
                    >
                        {years.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    {/* BOTÓN MES SIGUIENTE */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
                        }
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* CALENDARIO */}
                <Calendar
                    mode="single"
                    selected={dateObj}
                    onSelect={(date) => {
                        const iso = formatToIso(date || undefined);
                        onChange(iso);
                        setOpen(false);
                    }}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                />
            </PopoverContent>
        </Popover>
    );
}

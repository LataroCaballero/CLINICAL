"use client";

import { getPresupuestoEstadoChip } from "@/lib/presupuestos/estadoPresupuesto";
import { EstadoPresupuesto } from "@/types/presupuesto";
import { cn } from "@/lib/utils";

type Props = {
    estado?: EstadoPresupuesto | null;
    className?: string;
};

export default function EstadoPresupuestoChip({
    estado,
    className,
}: Props) {
    const { label, className: baseClass } =
        getPresupuestoEstadoChip(estado);

    return (
        <span
            className={cn(
                "px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap inline-flex items-center",
                baseClass,
                className
            )}
        >
            {label}
        </span>
    );
}
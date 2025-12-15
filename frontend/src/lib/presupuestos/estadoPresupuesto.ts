import { EstadoPresupuesto } from "@/types/presupuesto";

/**
 * UI mapping para EstadoPresupuesto.
 * Centraliza label + estilos de chip.
 */

export const PRESUPUESTO_ESTADO_META: Record<
    EstadoPresupuesto,
    { label: string; className: string }
> = {
    BORRADOR: {
        label: "Borrador",
        className: "bg-gray-100 text-gray-700",
    },
    ENVIADO: {
        label: "Enviado",
        className: "bg-yellow-100 text-yellow-700",
    },
    ACEPTADO: {
        label: "Aceptado",
        className: "bg-green-100 text-green-700",
    },
    RECHAZADO: {
        label: "Rechazado",
        className: "bg-red-100 text-red-700",
    },
    CANCELADO: {
        label: "Cancelado",
        className: "bg-zinc-200 text-zinc-700",
    },
};

export function getPresupuestoEstadoChip(
    estado?: EstadoPresupuesto | null
): { label: string; className: string } {
    if (!estado) {
        return {
            label: "Sin presupuesto",
            className: "bg-gray-50 text-gray-400",
        };
    }

    return (
        PRESUPUESTO_ESTADO_META[estado] ?? {
            label: estado,
            className: "bg-gray-100 text-gray-700",
        }
    );
}

/**
 * Helper de dominio (UI / métricas)
 */
export function isPresupuestoActivo(
    estado?: EstadoPresupuesto | null
): boolean {
    return estado === EstadoPresupuesto.BORRADOR ||
        estado === EstadoPresupuesto.ENVIADO;
}
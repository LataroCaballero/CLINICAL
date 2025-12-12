import axios from "@/lib/axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const createPaciente = async (payload: any) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pacientes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Error al crear paciente");
    }

    return res.json();
};

export function useCreatePaciente() {
    return useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pacientes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            // Intentar parsear JSON sin romper
            let body: any = null;
            try {
                body = await res.json();
            } catch {
                body = null;
            }

            if (!res.ok) {
                // Asegurar que siempre se propaga un error útil
                throw (
                    body || {
                        statusCode: res.status,
                        message: "Error desconocido al crear paciente",
                    }
                );
            }

            return body;
        },
    });
}

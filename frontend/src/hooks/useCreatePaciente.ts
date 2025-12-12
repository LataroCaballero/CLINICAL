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

            if (!res.ok) {
                const error = await res.json();
                throw error;
            }

            return res.json();
        },

        onError: (error: any) => {
            if (error?.statusCode === 409) {
                toast.error("El DNI ya está registrado.");
            } else {
                toast.error("Ocurrió un error al crear el paciente.");
            }
        },

        onSuccess: () => {
            toast.success("Paciente creado correctamente.");
        }
    });
}

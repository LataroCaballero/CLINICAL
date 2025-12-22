import { z } from "zod";

export const createTurnoSchema = z.object({
    profesionalId: z.string().uuid(),
    tipoTurnoId: z.string().uuid(),
    inicio: z.string().min(1),
    observaciones: z.string().optional(),
});

export type CreateTurnoForm = z.infer<typeof createTurnoSchema>;
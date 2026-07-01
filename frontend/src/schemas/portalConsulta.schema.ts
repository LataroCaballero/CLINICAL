import { z } from "zod";

export const portalConsultaSchema = z.object({
  mensaje: z
    .string()
    .min(1, "Escribi tu consulta")
    .max(2000, "La consulta es muy larga"),
});

export type PortalConsultaValues = z.infer<typeof portalConsultaSchema>;

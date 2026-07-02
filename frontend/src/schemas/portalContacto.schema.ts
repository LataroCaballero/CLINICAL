import { z } from "zod";

export const portalContactoSchema = z.object({
  telefono: z.string().optional(),
  telefonoAlternativo: z.string().optional(),
  email: z.string().email("Email invalido").or(z.literal("")).optional(),
  direccion: z.string().optional(),
  contactoEmergenciaNombre: z.string().optional(),
  contactoEmergenciaTelefono: z.string().optional(),
  contactoEmergenciaRelacion: z.string().optional(),
});

export type PortalContactoValues = z.infer<typeof portalContactoSchema>;

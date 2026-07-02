"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUpdateContacto } from "@/hooks/usePortalDatos";
import type { PortalDatos, UpdateContactoPayload } from "@/types/portal";
import {
  portalContactoSchema,
  type PortalContactoValues,
} from "@/schemas/portalContacto.schema";

interface Props {
  datos: PortalDatos;
}

/**
 * Seccion "Info basica" del portal del paciente.
 * Formulario RHF+Zod de contacto con pre-fill desde datos.contacto.
 * Guardado via useUpdateContacto → PATCH /paciente-portal/public/datos-personales.
 * Omite campos vacios del payload (consistente con pickPresent del backend, D-06/F54).
 */
export function PortalInfoBasica({ datos }: Props) {
  const updateContacto = useUpdateContacto();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PortalContactoValues>({
    resolver: zodResolver(portalContactoSchema),
    defaultValues: {
      telefono: datos.contacto.telefono ?? "",
      telefonoAlternativo: datos.contacto.telefonoAlternativo ?? "",
      email: datos.contacto.email ?? "",
      direccion: datos.contacto.direccion ?? "",
      contactoEmergenciaNombre: datos.contacto.contactoEmergenciaNombre ?? "",
      contactoEmergenciaTelefono: datos.contacto.contactoEmergenciaTelefono ?? "",
      contactoEmergenciaRelacion: datos.contacto.contactoEmergenciaRelacion ?? "",
    },
  });

  const onSubmit = async (values: PortalContactoValues) => {
    // Construir payload omitiendo strings vacios (pickPresent-compatible)
    const payload: UpdateContactoPayload = {};
    if (values.telefono) payload.telefono = values.telefono;
    if (values.telefonoAlternativo)
      payload.telefonoAlternativo = values.telefonoAlternativo;
    if (values.email) payload.email = values.email;
    if (values.direccion) payload.direccion = values.direccion;
    if (values.contactoEmergenciaNombre)
      payload.contactoEmergenciaNombre = values.contactoEmergenciaNombre;
    if (values.contactoEmergenciaTelefono)
      payload.contactoEmergenciaTelefono = values.contactoEmergenciaTelefono;
    if (values.contactoEmergenciaRelacion)
      payload.contactoEmergenciaRelacion = values.contactoEmergenciaRelacion;

    try {
      await updateContacto.mutateAsync(payload);
      toast.success("Guardamos tus datos");
    } catch {
      toast.error("No pudimos guardar, proba de nuevo");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 text-base"
    >
      {/* Telefono */}
      <div className="space-y-1">
        <Label htmlFor="telefono" className="text-base">
          Telefono
        </Label>
        <Input
          id="telefono"
          inputMode="tel"
          placeholder="Tu telefono"
          {...register("telefono")}
        />
      </div>

      {/* Telefono alternativo */}
      <div className="space-y-1">
        <Label htmlFor="telefonoAlternativo" className="text-base">
          Telefono alternativo
        </Label>
        <Input
          id="telefonoAlternativo"
          inputMode="tel"
          placeholder="Otro telefono (opcional)"
          {...register("telefonoAlternativo")}
        />
      </div>

      {/* Email */}
      <div className="space-y-1">
        <Label htmlFor="email" className="text-base">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          placeholder="Tu email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      {/* Direccion */}
      <div className="space-y-1">
        <Label htmlFor="direccion" className="text-base">
          Domicilio
        </Label>
        <Input
          id="direccion"
          placeholder="Tu domicilio"
          {...register("direccion")}
        />
      </div>

      {/* Contacto de emergencia */}
      <div className="space-y-3 pt-2 border-t">
        <p className="font-semibold text-base">Contacto de emergencia</p>

        <div className="space-y-1">
          <Label htmlFor="contactoEmergenciaNombre" className="text-base">
            Nombre
          </Label>
          <Input
            id="contactoEmergenciaNombre"
            placeholder="Nombre del contacto"
            {...register("contactoEmergenciaNombre")}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="contactoEmergenciaTelefono" className="text-base">
            Telefono
          </Label>
          <Input
            id="contactoEmergenciaTelefono"
            inputMode="tel"
            placeholder="Telefono del contacto"
            {...register("contactoEmergenciaTelefono")}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="contactoEmergenciaRelacion" className="text-base">
            Relacion
          </Label>
          <Input
            id="contactoEmergenciaRelacion"
            placeholder="Ej: madre, pareja, hermano"
            {...register("contactoEmergenciaRelacion")}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}

"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";

import { Button } from "@/components/ui/button";
import PacienteDetails from "./PacienteDetails";
import PacienteDetailsSkeleton from "./PacienteDetailsSkeleton";
import { usePaciente } from "@/hooks/usePaciente";
import { useState } from "react";

export default function PatientDrawer({
  open,
  onOpenChange,
  pacienteId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteId: string | null;
}) {
  const { data: paciente, isLoading, isError } = usePaciente(pacienteId);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] flex flex-col">

        {/* HEADER */}
        <DrawerHeader className="border-b">
          <DrawerTitle className="text-lg font-semibold text-center">
            Información del paciente
          </DrawerTitle>
        </DrawerHeader>

        {/* CONTENIDO SCROLLEABLE */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-3xl mx-auto">

            {isLoading && <PacienteDetailsSkeleton />}

            {isError && (
              <div className="p-4 border border-red-300 rounded text-red-600">
                Error al cargar el paciente.
              </div>
            )}

            {paciente && !isLoading && <PacienteDetails paciente={paciente} />}
          </div>
        </div>

        {/* FOOTER FIJO */}
        <div className="border-t p-4 bg-white">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full max-w-sm mx-auto block">
              Cerrar
            </Button>
          </DrawerClose>
        </div>

      </DrawerContent>
    </Drawer>
  );
}

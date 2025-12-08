"use client";

import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DataTableRowActions({ paciente }: { paciente: any }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => console.log("Ver perfil", paciente.id)}
        >
          Ver perfil
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => console.log("Nuevo turno", paciente.id)}
        >
          Crear turno
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => console.log("Historia clínica", paciente.id)}
        >
          Historia clínica
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

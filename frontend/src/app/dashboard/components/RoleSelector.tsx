"use client";
import { useUserStore } from "@/lib/stores/useUserStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RoleSelector() {
  const { role, setUser } = useUserStore();

  return (
    <div className="flex items-center gap-2 mt-4">
      <span className="text-sm text-gray-500">Rol actual:</span>
      <Select
        onValueChange={(val) => setUser("Federico García", val as any)}
        defaultValue={role}
      >
        <SelectTrigger className="w-[180px] bg-white">
          <SelectValue placeholder="Seleccionar rol" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ADMINISTRADOR">Administrador</SelectItem>
          <SelectItem value="PROFESIONAL">Profesional</SelectItem>
          <SelectItem value="SECRETARIA">Secretaria</SelectItem>
          <SelectItem value="PACIENTE">Paciente</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

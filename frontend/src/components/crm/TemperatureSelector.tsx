"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { TemperaturaPaciente } from "@/hooks/useCRMKanban";
import { useUpdateTemperatura } from "@/hooks/useUpdateTemperatura";

const TEMP_CONFIG: Record<
  TemperaturaPaciente,
  { label: string; icon: string; className: string }
> = {
  CALIENTE: { label: "Caliente", icon: "🔥", className: "text-red-500" },
  TIBIO: { label: "Tibio", icon: "🌡️", className: "text-amber-500" },
  FRIO: { label: "Frío", icon: "🧊", className: "text-blue-400" },
};

interface Props {
  pacienteId: string;
  current: TemperaturaPaciente | null;
}

export function TemperatureSelector({ pacienteId, current }: Props) {
  const { mutate, isPending } = useUpdateTemperatura();

  const config = current ? TEMP_CONFIG[current] : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1 text-sm"
          disabled={isPending}
        >
          {config ? (
            <span className={config.className}>{config.icon}</span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.entries(TEMP_CONFIG) as [TemperaturaPaciente, (typeof TEMP_CONFIG)[TemperaturaPaciente]][]).map(
          ([value, { label, icon, className }]) => (
            <DropdownMenuItem
              key={value}
              onClick={() => mutate({ pacienteId, temperatura: value })}
              className={current === value ? "bg-muted" : ""}
            >
              <span className={className + " mr-2"}>{icon}</span>
              {label}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

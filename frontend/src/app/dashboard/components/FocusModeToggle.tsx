"use client";

import { Switch } from "@/components/ui/switch";
import { useUIStore } from "@/lib/stores/useUIStore";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { cn } from "@/lib/utils";

export default function FocusModeToggle() {
  const effectiveProfessionalId = useEffectiveProfessionalId();
  const { focusModeEnabled, toggleFocusMode } = useUIStore();

  if (!effectiveProfessionalId) return null;

  return (
    <div className="flex items-center gap-2">
      {focusModeEnabled && (
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
      )}
      <label
        htmlFor="focus-mode"
        className={cn(
          "text-xs font-medium cursor-pointer select-none",
          focusModeEnabled ? "text-violet-300" : "text-gray-600"
        )}
      >
        Modo Consulta
      </label>
      <Switch
        id="focus-mode"
        checked={focusModeEnabled}
        onCheckedChange={toggleFocusMode}
        className="data-[state=checked]:bg-violet-600"
      />
    </div>
  );
}

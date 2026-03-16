"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUpdateWhatsappOptIn } from "@/hooks/useUpdateWhatsappOptIn";

interface WhatsappOptInToggleProps {
  pacienteId: string;
  optIn: boolean;
  optInAt?: string | null;
}

function formatOptInDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function WhatsappOptInToggle({
  pacienteId,
  optIn,
  optInAt,
}: WhatsappOptInToggleProps) {
  const { mutate: updateOptIn, isPending } = useUpdateWhatsappOptIn();

  const handleToggle = (checked: boolean) => {
    updateOptIn({ pacienteId, optIn: checked });
  };

  return (
    <div className="flex items-start gap-3">
      <Switch
        id={`whatsapp-opt-in-${pacienteId}`}
        checked={optIn}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />
      <div className="flex flex-col">
        <Label
          htmlFor={`whatsapp-opt-in-${pacienteId}`}
          className="cursor-pointer leading-snug"
        >
          Acepta mensajes por WhatsApp
        </Label>
        {optIn && optInAt ? (
          <span className="text-xs text-muted-foreground">
            Aceptó el {formatOptInDate(optInAt)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Sin consentimiento registrado
          </span>
        )}
      </div>
    </div>
  );
}

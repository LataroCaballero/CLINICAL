"use client";
import { Phone, MessageSquare, MapPin, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useContactos } from "@/hooks/useContactos";
import { ContactoSheet } from "@/components/crm/ContactoSheet";
import { Button } from "@/components/ui/button";

const TIPO_ICONS = {
  LLAMADA: Phone,
  MENSAJE: MessageSquare,
  PRESENCIAL: MapPin,
};

const TIPO_LABELS = {
  LLAMADA: "Llamada",
  MENSAJE: "Mensaje",
  PRESENCIAL: "Presencial",
};

interface ContactosSectionProps {
  pacienteId: string;
  pacienteNombre: string;
}

export function ContactosSection({
  pacienteId,
  pacienteNombre,
}: ContactosSectionProps) {
  const { data, isLoading } = useContactos(pacienteId, 5);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const contactos = data?.contactos ?? [];
  const diasSinContacto = data?.diasSinContacto ?? 0;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-3">
      {/* Header de sección */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Historial de contactos</h3>
          {diasSinContacto > 0 && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                diasSinContacto > 14
                  ? "bg-red-100 text-red-700"
                  : diasSinContacto > 7
                  ? "bg-amber-100 text-amber-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {diasSinContacto === 0 ? "Hoy" : `${diasSinContacto}d sin contacto`}
            </span>
          )}
        </div>
        <ContactoSheet
          pacienteId={pacienteId}
          pacienteNombre={pacienteNombre}
          modalMode={false}
          trigger={
            <Button variant="outline" size="sm" className="h-7 text-xs">
              + Registrar
            </Button>
          }
        />
      </div>

      {/* Lista de contactos */}
      {contactos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Sin interacciones registradas
        </p>
      ) : (
        <div className="space-y-2">
          {contactos.map((c) => {
            const Icon =
              TIPO_ICONS[c.tipo as keyof typeof TIPO_ICONS] ?? Clock;
            return (
              <div
                key={c.id}
                className="flex gap-3 p-2 rounded-lg hover:bg-muted/50"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">
                      {TIPO_LABELS[c.tipo as keyof typeof TIPO_LABELS] ?? c.tipo}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(c.fecha), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </div>
                  {c.nota && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {c.nota}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {total > 5 && (
            <button
              type="button"
              className="w-full text-xs text-primary hover:underline py-1"
              onClick={() => {
                /* future: expand or open full-page view */
              }}
            >
              Ver todos ({total})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

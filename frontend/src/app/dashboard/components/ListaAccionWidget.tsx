"use client";
import Link from "next/link";
import { Flame, Thermometer, Snowflake, ListChecks, ArrowRight } from "lucide-react";
import { useListaAccion } from "@/hooks/useListaAccion";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { Button } from "@/components/ui/button";

const TEMPERATURA_CONFIG = {
  CALIENTE: { icon: Flame, className: "text-red-500" },
  TIBIO: { icon: Thermometer, className: "text-amber-500" },
  FRIO: { icon: Snowflake, className: "text-blue-400" },
} as const;

export function ListaAccionWidget() {
  const effectiveProfessionalId = useEffectiveProfessionalId();
  const { data, isLoading } = useListaAccion(effectiveProfessionalId);

  const topItems = (data?.items ?? []).slice(0, 3);
  const total = data?.total ?? 0;

  if (!effectiveProfessionalId) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Lista de Acción</h3>
          {total > 0 && (
            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">
              {total}
            </span>
          )}
        </div>
        <Link href="/dashboard/accion">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : topItems.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          Sin pacientes pendientes hoy
        </p>
      ) : (
        <div className="space-y-2">
          {topItems.map((item) => {
            const tempConfig = item.temperatura
              ? TEMPERATURA_CONFIG[item.temperatura as keyof typeof TEMPERATURA_CONFIG]
              : null;
            const TempIcon = tempConfig?.icon;
            return (
              <div key={item.id} className="flex items-center gap-2 py-1">
                {TempIcon && (
                  <TempIcon className={`w-3.5 h-3.5 flex-shrink-0 ${tempConfig?.className}`} />
                )}
                <span className="text-sm flex-1 truncate">{item.nombreCompleto}</span>
                <span
                  className={`text-xs flex-shrink-0 ${
                    item.diasSinContacto > 14
                      ? "text-red-500 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.diasSinContacto}d
                </span>
              </div>
            );
          })}
          {total > 3 && (
            <Link
              href="/dashboard/accion"
              className="text-xs text-primary hover:underline block text-center pt-1"
            >
              +{total - 3} más
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

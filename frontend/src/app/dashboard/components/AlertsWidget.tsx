"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  CalendarDays,
  DollarSign,
  Package,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import {
  useAlertasResumen,
  AlertaModulo,
  Severity,
} from "@/hooks/useAlertasResumen";
import { cn } from "@/lib/utils";

const moduleRoutes: Record<string, string> = {
  turnos: "/dashboard/turnos",
  finanzas: "/dashboard/finanzas",
  stock: "/dashboard/stock",
};

const moduleIcons: Record<string, React.ReactNode> = {
  turnos: <CalendarDays className="w-4 h-4" />,
  finanzas: <DollarSign className="w-4 h-4" />,
  stock: <Package className="w-4 h-4" />,
};

const moduleLabels: Record<string, string> = {
  turnos: "Turnos",
  finanzas: "Finanzas",
  stock: "Stock",
};

const severityBorder: Record<Severity, string> = {
  INFO: "border-l-blue-500",
  WARNING: "border-l-amber-500",
  CRITICAL: "border-l-red-500",
};

const severityIcon: Record<Severity, string> = {
  INFO: "text-blue-600",
  WARNING: "text-amber-600",
  CRITICAL: "text-red-600",
};

export default function AlertsWidget() {
  const router = useRouter();
  const { data, isLoading } = useAlertasResumen();

  const alertas = data?.alertas ?? [];

  return (
    <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-800">
          Alertas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-48 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : alertas.length === 0 ? (
          <div className="flex items-center gap-3 py-4 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Todo en orden</span>
          </div>
        ) : (
          alertas.map((alerta) => (
            <button
              key={alerta.modulo}
              onClick={() => {
                const route = moduleRoutes[alerta.modulo];
                if (route) router.push(route);
              }}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg border-l-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left",
                severityBorder[alerta.severity]
              )}
            >
              <div className={cn("mt-0.5", severityIcon[alerta.severity])}>
                {moduleIcons[alerta.modulo]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">
                    {moduleLabels[alerta.modulo] ?? alerta.modulo}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] px-1.5 py-0.5",
                      alerta.severity === "CRITICAL" &&
                        "bg-red-100 text-red-700",
                      alerta.severity === "WARNING" &&
                        "bg-amber-100 text-amber-700"
                    )}
                  >
                    {alerta.count}
                  </Badge>
                </div>
                {alerta.detalle?.items && (
                  <span className="text-xs text-gray-500 mt-0.5 block">
                    {alerta.detalle.items
                      .map((item) => `${item.count} ${item.tipo.toLowerCase()}`)
                      .join(" · ")}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}

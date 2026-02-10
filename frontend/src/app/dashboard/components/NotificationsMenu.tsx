"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, DollarSign, Package, CalendarDays, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAlertasResumen, AlertaModulo, Severity } from "@/hooks/useAlertasResumen";
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

const severityColors: Record<Severity, string> = {
  INFO: "text-blue-600",
  WARNING: "text-amber-600",
  CRITICAL: "text-red-600",
};

const severityBgColors: Record<Severity, string> = {
  INFO: "bg-blue-500",
  WARNING: "bg-amber-500",
  CRITICAL: "bg-red-500",
};

function getMaxSeverity(alertas: AlertaModulo[]): Severity {
  if (alertas.some((a) => a.severity === "CRITICAL")) return "CRITICAL";
  if (alertas.some((a) => a.severity === "WARNING")) return "WARNING";
  return "INFO";
}

export default function NotificationsMenu() {
  const router = useRouter();
  const { data, isLoading } = useAlertasResumen();

  const alertas = data?.alertas ?? [];
  const totalCount = data?.totalCount ?? 0;
  const maxSeverity = alertas.length > 0 ? getMaxSeverity(alertas) : "INFO";

  const handleAlertClick = (modulo: string) => {
    const route = moduleRoutes[modulo];
    if (route) {
      router.push(route);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-gray-100 rounded-full"
        >
          <Bell className="w-5 h-5 text-gray-700" />
          {totalCount > 0 && (
            <Badge
              className={cn(
                "absolute -top-1 -right-1 text-white text-[10px] px-1.5 py-0.5 rounded-full",
                severityBgColors[maxSeverity]
              )}
            >
              {totalCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 bg-white shadow-md border border-gray-200 rounded-lg overflow-hidden"
      >
        <DropdownMenuLabel className="px-3 py-2 text-sm font-medium text-gray-800">
          Alertas del sistema
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : alertas.length === 0 ? (
          <p className="text-sm text-gray-500 px-3 py-4 text-center">
            Todo en orden. No hay alertas pendientes.
          </p>
        ) : (
          alertas.map((alerta) => (
            <DropdownMenuItem
              key={alerta.modulo}
              onClick={() => handleAlertClick(alerta.modulo)}
              className="flex items-start gap-3 px-3 py-3 hover:bg-gray-50 cursor-pointer"
            >
              <div className={cn("mt-0.5", severityColors[alerta.severity])}>
                {moduleIcons[alerta.modulo]}
              </div>
              <div className="flex flex-col flex-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800 capitalize">
                    {alerta.modulo}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] px-1.5 py-0.5",
                      alerta.severity === "CRITICAL" && "bg-red-100 text-red-700",
                      alerta.severity === "WARNING" && "bg-amber-100 text-amber-700"
                    )}
                  >
                    {alerta.count}
                  </Badge>
                </div>
                {alerta.detalle?.items && (
                  <span className="text-gray-500 text-xs mt-1">
                    {alerta.detalle.items
                      .map((item) => `${item.count} ${item.tipo.toLowerCase()}`)
                      .join(" · ")}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

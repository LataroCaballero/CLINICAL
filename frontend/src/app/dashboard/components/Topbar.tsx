"use client";
import {
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useUIStore } from "@/lib/stores/useUIStore";
import NotificationsMenu from "./NotificationsMenu";
import FocusModeToggle from "./FocusModeToggle";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";


export default function Topbar() {
  const { sidebarCollapsed, toggleSidebar, focusModeEnabled } = useUIStore();
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);

  const labelMap: Record<string, string> = {
    dashboard: "Inicio",
    turnos: "Turnos",
    pacientes: "Pacientes",
    "historia-clinica": "Historia Clínica",
    finanzas: "Finanzas",
    stock: "Stock",
    reportes: "Reportes",
    configuracion: "Configuración",
    "cuentas-corrientes": "Cuentas Corrientes",
    facturacion: "Facturación",
    pagos: "Pagos",
    ventas: "Registrar Ventas",
    catalogo: "Ver Catálogo"
  };

  return (
    <header
      className={cn(
        "flex items-center justify-between border-b pb-3 pt-3 transition-all duration-300",
        focusModeEnabled
          ? "bg-[var(--fc-bg-surface)] border-[var(--fc-border)]"
          : "bg-transparent border-gray-200",
        sidebarCollapsed ? "md:ml-20" : "md:ml-64"
      )}
    >
      {/* Left section */}
      <div className="h-[10px] flex items-center justify-between px-4">
        {/* Toggle sidebar */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "hidden md:block p-2 rounded-md transition",
            focusModeEnabled
              ? "hover:bg-slate-700 text-slate-300"
              : "hover:bg-gray-100"
          )}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className={cn("w-5 h-5", focusModeEnabled ? "text-slate-300" : "text-gray-600")} />
          ) : (
            <PanelLeftClose className={cn("w-5 h-5", focusModeEnabled ? "text-slate-300" : "text-gray-600")} />
          )}
        </button>

        {/* Breadcrumb */}
        <nav className={cn(
          "flex items-center gap-2 text-sm ml-2",
          focusModeEnabled ? "text-slate-400" : "text-gray-500"
        )}>
          {focusModeEnabled && (
            <Badge className="bg-violet-600 text-white text-[10px] px-2 py-0.5 mr-2">
              CONSULTA
            </Badge>
          )}
          {segments.length === 0 ? (
            <span className={cn(
              "font-medium",
              focusModeEnabled ? "text-slate-200" : "text-gray-800"
            )}>
              Dashboard
            </span>
          ) : (
            segments.map((segment, index) => {
              const href = "/" + segments.slice(0, index + 1).join("/");
              const isLast = index === segments.length - 1;
              const label = labelMap[segment] || segment;

              return (
                <div key={segment} className="flex items-center gap-2">
                  {!isLast ? (
                    <Link
                      href={href}
                      className={cn(
                        "font-medium transition",
                        focusModeEnabled
                          ? "text-slate-200 hover:text-violet-400"
                          : "text-gray-800 hover:text-indigo-600"
                      )}
                    >
                      {label}
                    </Link>
                  ) : (
                    <span className={focusModeEnabled ? "text-slate-400" : "text-gray-500"}>
                      {label}
                    </span>
                  )}
                  {!isLast && (
                    <ChevronRight className={cn(
                      "w-4 h-4",
                      focusModeEnabled ? "text-slate-600" : "text-gray-400"
                    )} />
                  )}
                </div>
              );
            })
          )}
        </nav>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4 pr-4">
        <FocusModeToggle />
        <NotificationsMenu />
      </div>
    </header>
  );
}

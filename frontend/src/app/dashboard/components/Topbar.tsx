"use client";
import {
  Bell,
  ChevronRight,
  UserCircle2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useUserStore } from "@/lib/stores/useUserStore";
import { useUIStore } from "@/lib/stores/useUIStore";
import NotificationsMenu from "./NotificationsMenu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Monitor } from "lucide-react";


export default function Topbar() {
  const { name, role } = useUserStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const pathname = usePathname();

  //Cambiar de dock a sidebar
  const { showDock, toggleDock } = useUIStore();

  // 🧭 Crear el breadcrumb dinámico
  // Ejemplo: /dashboard/pacientes/123 → ["dashboard", "pacientes", "123"]
  const segments = pathname.split("/").filter(Boolean);

  // 🔤 Mapeo de nombres amigables
  const labelMap: Record<string, string> = {
    dashboard: "Inicio",
    turnos: "Turnos",
    pacientes: "Pacientes",
    "historia-clinica": "Historia Clínica",
    finanzas: "Finanzas",
    stock: "Stock",
    reportes: "Reportes",
    configuracion: "Configuración",
  };

  return (
    <header className="flex items-center justify-between bg-transparent border-b border-gray-200 pb-3">
      {/* Left section */}
      <div className="h-[64px] flex items-center justify-between px-4">
        {/* Toggle sidebar */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-gray-100 transition"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-gray-600" />
          ) : (
            <PanelLeftClose className="w-5 h-5 text-gray-600" />
          )}
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 ml-2">
          {segments.length === 0 ? (
            <span className="font-medium text-gray-800">Dashboard</span>
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
                      className="hover:text-indigo-600 font-medium text-gray-800 transition"
                    >
                      {label}
                    </Link>
                  ) : (
                    <span className="text-gray-500">{label}</span>
                  )}
                  {!isLast && (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              );
            })
          )}
        </nav>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4 pr-4">
        <NotificationsMenu />

        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-gray-400" />
          <Switch checked={showDock} onCheckedChange={toggleDock} />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800">{name}</p>
            <p className="text-xs text-gray-500 capitalize">
              {role.toLowerCase()}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
            <UserCircle2 className="w-6 h-6 text-gray-400" />
          </div>
        </div>
      </div>
    </header>
  );
}

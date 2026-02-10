"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Topbar from "./components/Topbar";
import DockNav from "./components/DockNav";
import { useUIStore } from "@/lib/stores/useUIStore";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import dynamic from "next/dynamic";
import {
  LiveTurnoPanel,
  LiveTurnoIndicator,
  LiveTurnoRecoveryDialog,
  LiveTurnoSyncChecker,
} from "@/components/live-turno";
import { MensajesProvider } from "@/providers/MensajesProvider";
import { cn } from "@/lib/utils";
import { hasRouteAccess } from "@/lib/permissions";

const Sidebar = dynamic(() => import("./components/Sidebar"), { ssr: false });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed, focusModeEnabled } = useUIStore();
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading, isError } = useCurrentUser();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!isLoading && (isError || !user)) {
      localStorage.removeItem("accessToken");
      router.replace("/login");
    }
  }, [isLoading, isError, user, router]);

  // Redirect si el usuario no tiene permiso para la ruta actual
  useEffect(() => {
    if (!isLoading && user && pathname) {
      if (!hasRouteAccess(pathname, user.rol)) {
        router.replace("/dashboard");
      }
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <MensajesProvider>
      <div
        className="flex min-h-screen transition-colors duration-300"
        data-mode={focusModeEnabled ? "consulta" : undefined}
      >
        {/* Sidebar solo desktop */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Contenedor principal */}
        <div className="flex-1 flex flex-col">
          {/* Contenedor que controla el espacio vertical */}
          <div className={cn(
            "transition-colors duration-300",
            focusModeEnabled ? "bg-[var(--fc-bg-primary)]" : "bg-gray-50"
          )}>
            <div className={cn(
              "border shadow-sm transition-colors duration-300",
              focusModeEnabled
                ? "bg-[var(--fc-bg-surface)] border-[var(--fc-border)]"
                : "bg-white"
            )}>
              <Topbar />
            </div>
          </div>

          {/* Contenido principal del dashboard */}
          <main
            className={cn(
              "flex-1 overflow-y-auto transition-all duration-300",
              sidebarCollapsed ? "md:ml-20" : "md:ml-64",
              focusModeEnabled && "bg-[var(--fc-bg-primary)]"
            )}
          >
            {children}
          </main>
          <div className="z-100">
            <DockNav />
          </div>
        </div>

        {/* LiveTurno Global Components */}
        <LiveTurnoPanel />
        <LiveTurnoIndicator />
        <LiveTurnoRecoveryDialog />
        <LiveTurnoSyncChecker />
      </div>
    </MensajesProvider>
  );
}

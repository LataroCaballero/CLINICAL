"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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

const Sidebar = dynamic(() => import("./components/Sidebar"), { ssr: false });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();
  const router = useRouter();
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
    <div className="flex">
      {/* Sidebar solo desktop */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Contenedor principal */}
      <div className="flex-1 flex flex-col">
        {/* Contenedor que controla el espacio vertical */}
        <div className="bg-gray-50">
          <div className="bg-white border shadow-sm">
            <Topbar />
          </div>
        </div>

        {/* Contenido principal del dashboard */}
        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarCollapsed ? "md:ml-20" : "md:ml-64"
          }`}
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
  );
}

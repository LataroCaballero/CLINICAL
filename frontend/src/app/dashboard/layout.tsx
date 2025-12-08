"use client";

import Topbar from "./components/Topbar";
import DockNav from "./components/DockNav";
import { useUIStore } from "@/lib/stores/useUIStore";
import dynamic from "next/dynamic";

const Sidebar = dynamic(() => import("./components/Sidebar"), { ssr: false });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();

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
    </div>
  );
}

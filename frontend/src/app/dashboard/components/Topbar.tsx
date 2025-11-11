"use client";
import { Bell, ChevronRight, UserCircle2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useUserStore } from "@/lib/stores/useUserStore";
import { useUIStore } from "@/lib/stores/useUIStore";
import NotificationsMenu from "./NotificationsMenu";

export default function Topbar() {
  const { name, role } = useUserStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <header className="flex items-center justify-between bg-transparent border-b border-gray-200 pb-3">
      {/* Left section with toggle */}
      <div className="h-[64px] flex items-center justify-between px-4">
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

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-medium text-gray-800">Dashboard</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span>{role === "ADMINISTRADOR" ? "Gestión general" : "Panel de trabajo"}</span>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
      <NotificationsMenu />

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800">{name}</p>
            <p className="text-xs text-gray-500 capitalize">{role.toLowerCase()}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
            <UserCircle2 className="w-6 h-6 text-gray-400" />
          </div>
        </div>
      </div>
    </header>
  );
}

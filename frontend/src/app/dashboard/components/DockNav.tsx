"use client";

import { useRouter } from "next/navigation";
import {
  MenuDock,
  type MenuDockItem,
} from "@/components/ui/shadcn-io/menu-dock/index";
import {
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  Boxes,
  BarChart2,
  Settings,
} from "lucide-react";

export default function DockNav() {
  const router = useRouter();

  const menuItems: MenuDockItem[] = [
    { label: "Inicio", icon: LayoutDashboard, onClick: () => router.push("/dashboard") },
    { label: "Turnos", icon: Calendar, onClick: () => router.push("/dashboard/turnos") },
    { label: "Pacientes", icon: Users, onClick: () => router.push("/dashboard/pacientes") },
    { label: "Finanzas", icon: DollarSign, onClick: () => router.push("/dashboard/finanzas") },
    { label: "Stock", icon: Boxes, onClick: () => router.push("/dashboard/stock") },
    { label: "Reportes", icon: BarChart2, onClick: () => router.push("/dashboard/reportes") },
    { label: "Perfil", icon: Settings, onClick: () => router.push("/dashboard/perfil") },
  ];

  return (
    
    <div className="fixed w-full bottom-0 overflow-x-auto no-scrollbar">
        <div className="w-max mx-auto px-0">
          <MenuDock
            items={menuItems}
            variant="default"
            className="!w-max !max-w-none !border-0 md:hidden"
          />
        </div>
      </div>
  );
}

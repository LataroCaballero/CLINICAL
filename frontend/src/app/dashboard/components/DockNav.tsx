"use client";

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
    const menuItems: MenuDockItem[] = [
        { label: 'Inicio', icon: LayoutDashboard, onClick: () => console.log('Home') },
        { label: 'Turnos', icon: Calendar, onClick: () => console.log('Home') },
        { label: 'Pacientes', icon: Users, onClick: () => console.log('Home') },
        { label: 'Finanzas', icon: DollarSign, onClick: () => console.log('Home') },
        { label: 'Stock', icon: Boxes, onClick: () => console.log('Home') },
        { label: 'Reportes', icon: BarChart2, onClick: () => console.log('Home') },
        { label: 'Perfil', icon: Settings, onClick: () => console.log('Profile') }
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

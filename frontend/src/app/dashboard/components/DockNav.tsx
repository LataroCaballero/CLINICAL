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
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { hasRouteAccess } from "@/lib/permissions";

export default function DockNav() {
  const router = useRouter();
  const { data: user } = useCurrentUser();

  const allItems: (MenuDockItem & { href: string })[] = [
    { label: "Inicio", icon: LayoutDashboard, href: "/dashboard", onClick: () => router.push("/dashboard") },
    { label: "Turnos", icon: Calendar, href: "/dashboard/turnos", onClick: () => router.push("/dashboard/turnos") },
    { label: "Pacientes", icon: Users, href: "/dashboard/pacientes", onClick: () => router.push("/dashboard/pacientes") },
    { label: "Finanzas", icon: DollarSign, href: "/dashboard/finanzas", onClick: () => router.push("/dashboard/finanzas") },
    { label: "Stock", icon: Boxes, href: "/dashboard/stock", onClick: () => router.push("/dashboard/stock") },
    { label: "Reportes", icon: BarChart2, href: "/dashboard/reportes", onClick: () => router.push("/dashboard/reportes") },
    { label: "Perfil", icon: Settings, href: "/dashboard/perfil", onClick: () => router.push("/dashboard/perfil") },
  ];

  const menuItems = allItems.filter((item) => hasRouteAccess(item.href, user?.rol));

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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  Boxes,
  BarChart2,
  Settings,
  UserCircle2,
} from "lucide-react";
import {
  Dock,
  DockIcon,
  DockItem,
  DockLabel,
} from "@/components/ui/shadcn-io/dock/index";

export default function DockNav() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
    { href: "/dashboard/turnos", label: "Turnos", icon: Calendar },
    { href: "/dashboard/pacientes", label: "Pacientes", icon: Users },
    { href: "/dashboard/finanzas", label: "Finanzas", icon: DollarSign },
    { href: "/dashboard/stock", label: "Stock", icon: Boxes },
    { href: "/dashboard/reportes", label: "Reportes", icon: BarChart2 },
    { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
  ];

  return (
    <Dock className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] backdrop-blur-md bg-white/70 border border-gray-200 shadow-lg align-middle">
      {links.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}>
          <DockItem
            className={`flex flex-col items-center justify-center align-middle ${
              pathname === href ? "text-indigo-600" : "text-gray-600 hover:text-indigo-500"
            }`}
          >
            <DockIcon className="flex items-center justify-center w-12 h-12">
              <Icon className="w-5 h-5" />
            </DockIcon>
            <DockLabel>{label}</DockLabel>
          </DockItem>
        </Link>
      ))}
      <DockItem>
        <DockIcon>
          <UserCircle2 className="w-5 h-5 text-gray-500" />
        </DockIcon>
        <DockLabel>Perfil</DockLabel>
      </DockItem>
    </Dock>
  );
}

"use client";
import {
  Home,
  Calendar,
  Users,
  FileText,
  DollarSign,
  Settings,
  LayoutDashboard,
  Boxes,
  BarChart2,
} from "lucide-react";
import Link from "next/link";
import { useUIStore } from "@/lib/stores/useUIStore";
import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import UserMenu from "./UserMenu";

export default function Sidebar() {
  const { sidebarCollapsed, expandSidebar, collapseSidebar } = useUIStore();
  const [isHovering, setIsHovering] = useState(false);
  const pathname = usePathname();

  const handleMouseEnter = () => {
    if (sidebarCollapsed) {
      setIsHovering(true);
      expandSidebar();
    }
  };

  const handleMouseLeave = () => {
    if (isHovering) {
      setIsHovering(false);
      collapseSidebar();
    }
  };

  const links = [
    { href: "/dashboard", label: "Inicio", icon: <LayoutDashboard className="w-5 h-5" /> },
    { href: "/dashboard/turnos", label: "Turnos", icon: <Calendar className="w-5 h-5" /> },
    { href: "/dashboard/pacientes", label: "Pacientes", icon: <Users className="w-5 h-5" /> },
    { href: "/dashboard/finanzas", label: "Finanzas", icon: <DollarSign className="w-5 h-5" /> },
    { href: "/dashboard/stock", label: "Stock", icon: <Boxes className="w-5 h-5" /> },
    { href: "/dashboard/reportes", label: "Reportes", icon: <BarChart2 className="w-5 h-5" /> },
    { href: "/dashboard/configuracion", label: "Configuración", icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <motion.aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      animate={{ width: sidebarCollapsed ? "5rem" : "16rem" }}
      transition={{ duration: 0.25 }}
      className="fixed 
      top-0 left-0 
      h-screen 
      bg-white/70 backdrop-blur-md 
      border-r border-gray-200 
      flex flex-col justify-between 
      md:p-4 
      transition-shadow duration-200 
      shadow-sm hover:shadow-md
      overflow-y-auto
      z-50"
    >
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-center md:justify-start gap-2 px-1">
          {!sidebarCollapsed && (
            <h2 className="text-sm font-semibold text-gray-800">Federico García</h2>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 mt-2">
          {links.map(({ href, label, icon }) => (
            <NavItem
              key={href}
              href={href}
              icon={icon}
              label={label}
              collapsed={sidebarCollapsed}
              active={pathname === href}
            />
          ))}
        </nav>
      </div>

      {/* Footer del Sidebar */}
      <div className="mt-auto pt-4 border-t border-gray-200">
        <UserMenu />
      </div>
    </motion.aside>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  active?: boolean;
}

function NavItem({ href, icon, label, collapsed, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? "bg-indigo-50 text-indigo-600 font-medium"
          : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
      } ${collapsed ? "justify-center" : ""}`}
    >
      {icon}
      {!collapsed && <span className="font-medium">{label}</span>}
    </Link>
  );
}

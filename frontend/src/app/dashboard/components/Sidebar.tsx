"use client";

import {
  Calendar,
  Users,
  DollarSign,
  Settings,
  LayoutDashboard,
  Boxes,
  BarChart2,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useUIStore } from "@/lib/stores/useUIStore";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import UserMenu from "./UserMenu";
import { ProfessionalSelector } from "@/components/ProfessionalSelector";
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { filterLinksByRole } from "@/lib/permissions";

interface SubItem {
  href: string;
  label: string;
}

interface LinkItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  subItems?: SubItem[];
  focusMode?: boolean; // true = visible in focus mode
}

// Hrefs visible in focus mode
const focusModeHrefs = new Set([
  "/dashboard",
  "/dashboard/turnos",
  "/dashboard/pacientes",
  "/dashboard/configuracion",
]);

export default function Sidebar() {
  const { sidebarCollapsed, expandSidebar, collapseSidebar, focusModeEnabled } = useUIStore();
  const [isHovering, setIsHovering] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
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

  // Auto-collapse in focus mode
  useEffect(() => {
    if (focusModeEnabled) {
      collapseSidebar();
    }
  }, [focusModeEnabled, collapseSidebar]);

  const { data: user, isLoading } = useCurrentUser();

  // Auto-expand menu if current path matches a subitem
  useEffect(() => {
    if (pathname.startsWith("/dashboard/stock")) {
      setExpandedMenu("/dashboard/stock");
    } else if (pathname.startsWith("/dashboard/finanzas")) {
      setExpandedMenu("/dashboard/finanzas");
    }
  }, [pathname]);

  if (isLoading || !user) return null;

  const canSelectProfessional =
    user.rol === 'ADMIN' ||
    user.rol === 'SECRETARIA' ||
    user.rol === 'FACTURADOR';

  const allLinks: LinkItem[] = [
    {
      href: "/dashboard",
      label: "Inicio",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      href: "/dashboard/turnos",
      label: "Agenda",
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      href: "/dashboard/pacientes",
      label: "Pacientes",
      icon: <Users className="w-5 h-5" />,
    },
    {
      href: "/dashboard/finanzas",
      label: "Finanzas",
      icon: <DollarSign className="w-5 h-5" />,
      subItems: [
        { href: "/dashboard/finanzas", label: "Resumen" },
        { href: "/dashboard/finanzas/balance", label: "Balance" },
        { href: "/dashboard/finanzas/presupuestos", label: "Presupuestos" },
        { href: "/dashboard/finanzas/facturacion", label: "Facturación" },
        { href: "/dashboard/finanzas/proveedores", label: "Proveedores" },
      ],
    },
    {
      href: "/dashboard/stock",
      label: "Stock",
      icon: <Boxes className="w-5 h-5" />,
      subItems: [
        { href: "/dashboard/stock", label: "Inventario" },
        { href: "/dashboard/stock/ventas", label: "Ventas" },
        { href: "/dashboard/stock/catalogo", label: "Catálogo" },
        { href: "/dashboard/stock/ordenes", label: "Órdenes de Compra" },
        { href: "/dashboard/stock/proveedores", label: "Proveedores" },
      ],
    },
    {
      href: "/dashboard/reportes",
      label: "Reportes",
      icon: <BarChart2 className="w-5 h-5" />,
    },
    {
      href: "/dashboard/configuracion",
      label: "Configuración",
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const allowedLinks = filterLinksByRole(allLinks, user.rol);

  const links = focusModeEnabled
    ? allowedLinks.filter((l) => focusModeHrefs.has(l.href))
    : allowedLinks;

  const toggleMenu = (href: string) => {
    setExpandedMenu(expandedMenu === href ? null : href);
  };

  const fm = focusModeEnabled;

  return (
    <motion.aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={false}
      animate={{ width: sidebarCollapsed ? "5rem" : "16rem" }}
      transition={{ duration: 0.25 }}
      className={cn(
        "fixed top-0 left-0 h-screen backdrop-blur-md border-r flex flex-col justify-between md:p-4 transition-shadow duration-200 shadow-sm hover:shadow-md overflow-y-auto z-50",
        fm
          ? "bg-[#0f172a]/95 border-slate-700"
          : "bg-white/70 border-gray-200"
      )}
    >
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-center md:justify-start gap-2 px-1">
          {!sidebarCollapsed && canSelectProfessional && <ProfessionalSelector />}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 mt-2">
          {links.map((link) => (
            <div key={link.href}>
              {link.subItems && !link.disabled ? (
                <>
                  <NavItemWithSub
                    href={link.href}
                    icon={link.icon}
                    label={link.label}
                    collapsed={sidebarCollapsed}
                    active={pathname.startsWith(link.href)}
                    expanded={expandedMenu === link.href}
                    onToggle={() => toggleMenu(link.href)}
                    focusMode={fm}
                  />
                  <AnimatePresence>
                    {expandedMenu === link.href && !sidebarCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className={cn(
                          "ml-6 mt-1 flex flex-col gap-1 border-l-2 pl-3",
                          fm ? "border-slate-600" : "border-gray-200"
                        )}>
                          {link.subItems.map((sub) => (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={cn(
                                "text-sm py-1.5 px-2 rounded-md transition-colors",
                                pathname === sub.href
                                  ? fm
                                    ? "text-violet-400 bg-violet-500/10 font-medium"
                                    : "text-indigo-600 bg-indigo-50 font-medium"
                                  : fm
                                    ? "text-slate-400 hover:text-violet-400 hover:bg-slate-700"
                                    : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50"
                              )}
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <NavItem
                  href={link.href}
                  icon={link.icon}
                  label={link.label}
                  collapsed={sidebarCollapsed}
                  active={pathname === link.href}
                  disabled={link.disabled}
                  focusMode={fm}
                />
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer del Sidebar */}
      <div className={cn(
        "mt-auto pt-4 border-t",
        fm ? "border-slate-700" : "border-gray-200"
      )}>
        <UserMenu collapsed={sidebarCollapsed} />
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
  disabled?: boolean;
  focusMode?: boolean;
}

function NavItem({ href, icon, label, collapsed, active, disabled, focusMode }: NavItemProps) {
  const handleDisabledClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.info(`${label} en construcción`, {
      description: "Esta funcionalidad estará disponible próximamente.",
    });
  };

  const baseClasses = `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${collapsed ? "justify-center" : ""}`;

  if (disabled) {
    return (
      <button
        onClick={handleDisabledClick}
        className={cn(
          baseClasses,
          "cursor-not-allowed w-full",
          focusMode ? "text-slate-600 hover:bg-slate-800" : "text-gray-400 hover:bg-gray-50"
        )}
      >
        {icon}
        {!collapsed && <span className="font-medium">{label}</span>}
      </button>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        baseClasses,
        active
          ? focusMode
            ? "bg-violet-500/15 text-violet-400 font-medium"
            : "bg-indigo-50 text-indigo-600 font-medium"
          : focusMode
            ? "text-slate-300 hover:bg-slate-700 hover:text-violet-400"
            : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
      )}
    >
      {icon}
      {!collapsed && <span className="font-medium">{label}</span>}
    </Link>
  );
}

interface NavItemWithSubProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  active?: boolean;
  expanded: boolean;
  onToggle: () => void;
  focusMode?: boolean;
}

function NavItemWithSub({ href, icon, label, collapsed, active, expanded, onToggle, focusMode }: NavItemWithSubProps) {
  const baseClasses = `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors w-full ${collapsed ? "justify-center" : ""}`;

  if (collapsed) {
    return (
      <Link
        href={href}
        className={cn(
          baseClasses,
          active
            ? focusMode
              ? "bg-violet-500/15 text-violet-400 font-medium"
              : "bg-indigo-50 text-indigo-600 font-medium"
            : focusMode
              ? "text-slate-300 hover:bg-slate-700 hover:text-violet-400"
              : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
        )}
      >
        {icon}
      </Link>
    );
  }

  return (
    <button
      onClick={onToggle}
      className={cn(
        baseClasses,
        active
          ? focusMode
            ? "bg-violet-500/15 text-violet-400 font-medium"
            : "bg-indigo-50 text-indigo-600 font-medium"
          : focusMode
            ? "text-slate-300 hover:bg-slate-700 hover:text-violet-400"
            : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
      )}
    >
      {icon}
      <span className="font-medium flex-1 text-left">{label}</span>
      <ChevronDown
        className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
      />
    </button>
  );
}

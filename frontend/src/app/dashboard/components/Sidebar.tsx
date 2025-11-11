"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users2,
  CalendarDays,
  FileText,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/pacientes", label: "Pacientes", icon: Users2 },
  { href: "/dashboard/turnos", label: "Turnos", icon: CalendarDays },
  { href: "/dashboard/historia-clinica", label: "Historias Clínicas", icon: FileText },
  { href: "/dashboard/finanzas", label: "Finanzas", icon: DollarSign },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 240 }}
      transition={{ duration: 0.2 }}
      className="h-screen border-r bg-white flex flex-col justify-between shadow-sm"
    >
      {/* Header */}
      <div>
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <h1
            className={`text-xl font-bold text-indigo-600 transition-opacity ${
              collapsed ? "opacity-0" : "opacity-100"
            }`}
          >
            CLINICAL
          </h1>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hover:bg-gray-100 rounded-md p-1 transition"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Links */}
        <nav className="mt-4 flex flex-col">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-md mx-2 mb-1 transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-600 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -5 }}
                      transition={{ duration: 0.15 }}
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="border-t p-4 text-center">
        {!collapsed && (
          <p className="text-xs text-gray-500">© 2025 Clinical v2.0</p>
        )}
      </div>
    </motion.aside>
  );
}

"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserStore } from "@/lib/stores/useUserStore";
import { LogOut, Settings, User, Bell, CreditCard } from "lucide-react";

export default function UserMenu() {
  const { name, role } = useUserStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-3 rounded-lg p-2 hover:bg-gray-100 transition">
          <Avatar className="h-9 w-9">
            <AvatarImage src="/avatar.png" alt={name} />
            <AvatarFallback>{name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-left">
            <span className="text-sm font-semibold text-gray-800">{name}</span>
            <span className="text-xs text-gray-500">{role.toLowerCase()}</span>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-56 bg-white/90 backdrop-blur-md shadow-lg border border-gray-200"
        side="top"
        align="end"
      >
        <DropdownMenuLabel className="text-sm font-medium">
          {name}
          <p className="text-xs text-gray-500 mt-1">{role.toLowerCase()}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
          <User className="w-4 h-4 text-gray-500" />
          Mi perfil
        </DropdownMenuItem>

        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
          <Settings className="w-4 h-4 text-gray-500" />
          Configuración del sistema
        </DropdownMenuItem>

        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
          <Bell className="w-4 h-4 text-gray-500" />
          Notificaciones
        </DropdownMenuItem>

        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
          <CreditCard className="w-4 h-4 text-gray-500" />
          Suscripción y facturación
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="flex items-center gap-2 text-red-500 cursor-pointer">
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
import { LogOut, Settings, Bell, CreditCard } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { logout } from "@/lib/api";

const ROL_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  PROFESIONAL: "Profesional",
  SECRETARIA: "Secretaria",
  PACIENTE: "Paciente",
  FACTURADOR: "Facturador",
};

export default function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const fullName = user ? `${user.nombre || ''} ${user.apellido || ''}`.trim() : "";
  const initials = user ? `${user.nombre?.[0] || ''}${user.apellido?.[0] || ''}`.toUpperCase() || 'U' : "";
  const rolLabel = user ? ROL_LABELS[user.rol] || user.rol : "";

  const handleLogout = () => {
    queryClient.clear();
    logout(); // Llama al backend y limpia tokens
  };

  const handleGoToConfig = () => {
    router.push("/dashboard/configuracion");
  };

  const handleNotifications = () => {
    toast.info("Notificaciones en construcción", {
      description: "Esta funcionalidad estará disponible próximamente.",
    });
  };

  const handleSubscription = () => {
    toast.info("Suscripción y facturación en construcción", {
      description: "Esta funcionalidad estará disponible próximamente.",
    });
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-3 rounded-lg p-2 hover:bg-gray-100 transition">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.fotoUrl || "/images/avatar.png"} alt={fullName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-col leading-tight text-left">
              <span className="text-sm font-medium text-gray-800">{fullName}</span>
              <span className="text-xs text-gray-500">{rolLabel}</span>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-56 bg-white/90 backdrop-blur-md shadow-lg border border-gray-200"
        side="top"
        align="end"
      >
        <DropdownMenuLabel className="text-sm font-medium">
          {fullName}
          <p className="text-xs text-gray-500 mt-1">{rolLabel}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer"
          onClick={handleGoToConfig}
        >
          <Settings className="w-4 h-4 text-gray-500" />
          Configuración
        </DropdownMenuItem>

        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer"
          onClick={handleNotifications}
        >
          <Bell className="w-4 h-4 text-gray-500" />
          Notificaciones
        </DropdownMenuItem>

        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer"
          onClick={handleSubscription}
        >
          <CreditCard className="w-4 h-4 text-gray-500" />
          Suscripción y facturación
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="flex items-center gap-2 text-red-500 cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

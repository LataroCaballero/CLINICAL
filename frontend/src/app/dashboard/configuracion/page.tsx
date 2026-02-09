"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfesionalMe } from "@/hooks/useProfesionalMe";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import DatosProfesional from "./components/DatosProfesional";
import HorariosSemana from "./components/HorariosSemana";
import CalendarioDisponibilidad from "./components/CalendarioDisponibilidad";
import GestionUsuarios from "./components/GestionUsuarios";
import GestionTratamientos from "./components/GestionTratamientos";
import SuscripcionesReportes from "./components/SuscripcionesReportes";
import { GestionPlantillasHC } from "@/components/hc-templates/builder";

export default function ConfiguracionPage() {
  const { data: user, isLoading: loadingUser } = useCurrentUser();
  const { data: profesional, isLoading: loadingProfesional } =
    useProfesionalMe();

  if (loadingUser) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Vista para ADMIN
  if (user?.rol === "ADMIN") {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Configuración</h1>

        <Tabs defaultValue="usuarios" className="w-full">
          <TabsList className="max-w-md">
            <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
            <TabsTrigger value="reportes">Reportes</TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios" className="mt-6">
            <GestionUsuarios />
          </TabsContent>

          <TabsContent value="reportes" className="mt-6">
            <SuscripcionesReportes />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Vista para PROFESIONAL
  if (user?.rol === "PROFESIONAL") {
    if (loadingProfesional) {
      return (
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      );
    }

    if (!profesional) {
      return (
        <div className="p-6">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No se encontró tu perfil profesional.
            </p>
          </Card>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Configuración</h1>

        <Tabs defaultValue="datos" className="w-full">
          <TabsList className="grid w-full grid-cols-6 max-w-3xl">
            <TabsTrigger value="datos">Datos</TabsTrigger>
            <TabsTrigger value="horarios">Horarios</TabsTrigger>
            <TabsTrigger value="calendario">Calendario</TabsTrigger>
            <TabsTrigger value="tratamientos">Tratamientos</TabsTrigger>
            <TabsTrigger value="plantillas">Plantillas HC</TabsTrigger>
            <TabsTrigger value="reportes">Reportes</TabsTrigger>
          </TabsList>

          <TabsContent value="datos" className="mt-6">
            <DatosProfesional profesional={profesional} />
          </TabsContent>

          <TabsContent value="horarios" className="mt-6">
            <HorariosSemana profesional={profesional} />
          </TabsContent>

          <TabsContent value="calendario" className="mt-6">
            <CalendarioDisponibilidad profesional={profesional} />
          </TabsContent>

          <TabsContent value="tratamientos" className="mt-6">
            <GestionTratamientos />
          </TabsContent>

          <TabsContent value="plantillas" className="mt-6">
            <GestionPlantillasHC />
          </TabsContent>

          <TabsContent value="reportes" className="mt-6">
            <SuscripcionesReportes />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Para otros roles (SECRETARIA, FACTURADOR)
  return (
    <div className="p-6">
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          No tenés acceso a esta sección.
        </p>
      </Card>
    </div>
  );
}

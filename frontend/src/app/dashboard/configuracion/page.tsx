"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfesionalMe } from "@/hooks/useProfesionalMe";
import { useProfesionalById } from "@/hooks/useProfesionalById";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import DatosProfesional from "./components/DatosProfesional";
import HorariosSemana from "./components/HorariosSemana";
import CalendarioDisponibilidad from "./components/CalendarioDisponibilidad";
import GestionUsuarios from "./components/GestionUsuarios";
import GestionTratamientos from "./components/GestionTratamientos";
import SuscripcionesReportes from "./components/SuscripcionesReportes";
import { GestionPlantillasHC } from "@/components/hc-templates/builder";
import GestionProveedores from "./components/GestionProveedores";
import WhatsappConfigTab from "./components/WhatsappConfigTab";
import AfipConfigTab from "./components/AfipConfigTab";

export default function ConfiguracionPage() {
  const { data: user, isLoading: loadingUser } = useCurrentUser();
  const { data: profesional, isLoading: loadingProfesional } = useProfesionalMe();

  // SECRETARIA: usa el selector global del sidebar
  const effectiveProfId = useEffectiveProfessionalId();
  const { data: selectedProfesional, isLoading: loadingSelectedProf } =
    useProfesionalById(user?.rol === "SECRETARIA" ? effectiveProfId : null);

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
          <TabsList className="max-w-xl">
            <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
            <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="afip">AFIP</TabsTrigger>
            <TabsTrigger value="reportes">Reportes</TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios" className="mt-6">
            <GestionUsuarios />
          </TabsContent>

          <TabsContent value="proveedores" className="mt-6">
            <GestionProveedores />
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-6">
            <WhatsappConfigTab />
          </TabsContent>

          <TabsContent value="afip" className="mt-6">
            <AfipConfigTab />
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
          <TabsList className="grid w-full grid-cols-9 max-w-5xl">
            <TabsTrigger value="datos">Datos</TabsTrigger>
            <TabsTrigger value="horarios">Horarios</TabsTrigger>
            <TabsTrigger value="calendario">Calendario</TabsTrigger>
            <TabsTrigger value="tratamientos">Tratamientos</TabsTrigger>
            <TabsTrigger value="plantillas">Plantillas HC</TabsTrigger>
            <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="afip">AFIP</TabsTrigger>
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

          <TabsContent value="proveedores" className="mt-6">
            <GestionProveedores />
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-6">
            <WhatsappConfigTab />
          </TabsContent>

          <TabsContent value="afip" className="mt-6">
            <AfipConfigTab />
          </TabsContent>

          <TabsContent value="reportes" className="mt-6">
            <SuscripcionesReportes />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Vista para SECRETARIA — usa el selector global del sidebar
  if (user?.rol === "SECRETARIA") {
    if (!effectiveProfId) {
      return (
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Configuración de médicos</h1>
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Seleccioná un médico desde el selector del menú lateral para configurar su agenda.
            </p>
          </Card>
        </div>
      );
    }

    if (loadingSelectedProf) {
      return (
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      );
    }

    if (!selectedProfesional) {
      return (
        <div className="p-6">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No se encontró el perfil del médico.</p>
          </Card>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">
          Configuración — {selectedProfesional.usuario.nombre} {selectedProfesional.usuario.apellido}
        </h1>

        <Tabs defaultValue="tipos-turno" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="tipos-turno">Datos y tipos</TabsTrigger>
            <TabsTrigger value="horarios">Horarios</TabsTrigger>
            <TabsTrigger value="calendario">Calendario</TabsTrigger>
            <TabsTrigger value="tratamientos">Tratamientos</TabsTrigger>
          </TabsList>

          <TabsContent value="tipos-turno" className="mt-6">
            <DatosProfesional profesional={selectedProfesional} />
          </TabsContent>

          <TabsContent value="horarios" className="mt-6">
            <HorariosSemana profesional={selectedProfesional} />
          </TabsContent>

          <TabsContent value="calendario" className="mt-6">
            <CalendarioDisponibilidad profesional={selectedProfesional} />
          </TabsContent>

          <TabsContent value="tratamientos" className="mt-6">
            <GestionTratamientos profesionalId={selectedProfesional.id} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Para otros roles (FACTURADOR, etc.)
  return (
    <div className="p-6">
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No tenés acceso a esta sección.</p>
      </Card>
    </div>
  );
}

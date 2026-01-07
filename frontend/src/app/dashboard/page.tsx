"use client";

import KpiCard from "./components/KpiCard";
import PatientsTable from "./components/PatientsTable";
import QuickAppointment from "./components/QuickAppointment";
import UpcomingAppointments from "./components/UpcomingAppointments";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";

export default function DashboardPage() {
  const effectiveProfessionalId = useEffectiveProfessionalId();

  return (
    <div className="relative">
      <div className="flex min-h-screen bg-transparent text-gray-800 flex-col justify-center">

        {/* Main content */}
        <div className="flex-1 flex flex-col p-6">

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <KpiCard title="Fact. mensual" value="$1.250,00" change="+12.5%" subtitle="10 Oct - 10 Nov" />
            <KpiCard title="Pacientes" value="460" change="+20%" subtitle="más este mes" />
            <KpiCard title="Procedimientos" value="128" change="+12.5%" subtitle="más este mes" />
            <KpiCard title="Turnos" value="164" change="+4.5%" subtitle="más este mes" />
          </div>

          {/* Quick appointment scheduler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {effectiveProfessionalId ? (
              <>
                <QuickAppointment profesionalId={effectiveProfessionalId} />
                <UpcomingAppointments profesionalId={effectiveProfessionalId} />
              </>
            ) : (
              <div className="col-span-2 bg-white rounded-xl border p-8 text-center text-muted-foreground">
                Seleccioná un profesional para ver turnos y agendar citas.
              </div>
            )}
          </div>

          {/* Patients table */}
          <div className="mt-8">
            <PatientsTable />
          </div>
        </div>
      </div>
    </div>
  );
}

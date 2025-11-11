"use client";

import KpiCard from "./components/KpiCard";
import PatientsTable from "./components/PatientsTable";
import { RoleSelector } from "./components/RoleSelector";
import QuickAppointment from "./components/QuickAppointment";
import UpcomingAppointments from "./components/UpcomingAppointments";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-linear-to-b from-[#f9f9fb] to-[#ece9ff] text-gray-800 flex flex-col justify-center min-h-[calc(100vh-100px)]">

      {/* Main content */}
      <div className="flex-1 flex flex-col p-6">
        <RoleSelector />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <KpiCard title="Fact. mensual" value="$1.250,00" change="+12.5%" subtitle="10 Oct - 10 Nov" />
          <KpiCard title="Pacientes" value="460" change="+20%" subtitle="más este mes" />
          <KpiCard title="Procedimientos" value="128" change="+12.5%" subtitle="más este mes" />
          <KpiCard title="Turnos" value="164" change="+4.5%" subtitle="más este mes" />
        </div>

        {/* Quick appointment scheduler */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QuickAppointment />
          <UpcomingAppointments />
        </div>

        {/* Patients table */}
        <div className="mt-8">
          <PatientsTable />
        </div>
      </div>
    </div>
  );
}

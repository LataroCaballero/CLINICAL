"use client";

import { PacientesDataTable } from "./components/PacientesDataTable";
import { useState } from "react";

export default function PacientesPage() {
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-gray-800">Pacientes</h1>

      <PacientesDataTable />
    </div>
  );
}

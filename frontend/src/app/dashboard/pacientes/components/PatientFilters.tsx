"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PatientFormModal from "./PatientFormModal";
import { useState } from "react";

export default function PatientFilters() {
  const [activeTab, setActiveTab] = useState("activos");
  const [openModal, setOpenModal] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 bg-white border rounded-lg p-1">
        <Button
          variant={activeTab === "activos" ? "default" : "ghost"}
          onClick={() => setActiveTab("activos")}
        >
          Pacientes activos
        </Button>
        <Button
          variant={activeTab === "todos" ? "default" : "ghost"}
          onClick={() => setActiveTab("todos")}
        >
          Todos los pacientes
        </Button>
        <Button
          variant={activeTab === "archivados" ? "default" : "ghost"}
          onClick={() => setActiveTab("archivados")}
        >
          Archivados
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Input placeholder="Buscar..." className="w-64" />
        <Button variant="outline">Filtrar</Button>
        <Button
          className="bg-indigo-500 hover:bg-indigo-600 text-white"
          onClick={() => setOpenModal(true)}
        >
          + Nuevo paciente
        </Button>

        {/* Modal */}
        <PatientFormModal open={openModal} onOpenChange={setOpenModal} />
      </div>
    </div>
  );
}

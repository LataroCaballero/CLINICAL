"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const mockPatients = [
  {
    id: 1,
    nombre: "Lautaro Caballero",
    ultimaIntervencion: "Consulta",
    fecha: "18/03/2025",
    edad: 18,
    peso: 72,
    modificadoPor: "Federico García",
    estado: "activo",
  },
  {
    id: 2,
    nombre: "Romina González",
    ultimaIntervencion: "Bótox",
    fecha: "10/03/2025",
    edad: 29,
    peso: 59,
    modificadoPor: "Federico García",
    estado: "tratamiento",
  },
  {
    id: 3,
    nombre: "Eduardo Díaz",
    ultimaIntervencion: "Control",
    fecha: "11/03/2025",
    edad: 35,
    peso: 80,
    modificadoPor: "Federico García",
    estado: "archivado",
  },
];

export default function PatientsTable({ onSelectPatient }: any) {
  const [patients] = useState(mockPatients);

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case "activo":
        return "bg-green-100 text-green-700";
      case "tratamiento":
        return "bg-yellow-100 text-yellow-700";
      case "archivado":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Nombre</th>
            <th className="px-4 py-3 text-left font-medium">Última intervención</th>
            <th className="px-4 py-3 text-left font-medium">Fecha</th>
            <th className="px-4 py-3 text-left font-medium">Edad</th>
            <th className="px-4 py-3 text-left font-medium">Peso</th>
            <th className="px-4 py-3 text-left font-medium">Modificado por</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr
              key={p.id}
              className="border-b hover:bg-gray-50 cursor-pointer transition"
              onClick={() => onSelectPatient(p)}
            >
              <td className="px-4 py-3 flex items-center gap-2">
                <Badge className={`${getStatusColor(p.estado)} text-xs`}>
                  {p.estado}
                </Badge>
                <span className="font-medium text-gray-800">{p.nombre}</span>
              </td>
              <td className="px-4 py-3">{p.ultimaIntervencion}</td>
              <td className="px-4 py-3 text-gray-600">{p.fecha}</td>
              <td className="px-4 py-3">{p.edad}</td>
              <td className="px-4 py-3">{p.peso}</td>
              <td className="px-4 py-3 text-gray-600">{p.modificadoPor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

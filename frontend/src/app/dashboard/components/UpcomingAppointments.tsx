"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Appointment {
  tipoTurno: string;
  hora: string;
  paciente: string;
  estado: "confirmado" | "pendiente" | "cancelado";
}

const appointments: Appointment[] = [
  { tipoTurno: "Primera vez", hora: "11:00", paciente: "Lautaro Caballero", estado: "confirmado" },
  { tipoTurno: "Consulta", hora: "11:30", paciente: "Daniel Gutierrez", estado: "pendiente" },
  { tipoTurno: "Prequirúrgico", hora: "12:00", paciente: "Juan Pérez", estado: "confirmado" },
  { tipoTurno: "Cirugía", hora: "12:30", paciente: "Daniel", estado: "pendiente" },
  { tipoTurno: "Tratamiento", hora: "13:00", paciente: "Alfredo", estado: "confirmado" },
  { tipoTurno: "Consulta", hora: "13:30", paciente: "Julian", estado: "cancelado" },
  { tipoTurno: "Primera vez", hora: "14:00", paciente: "Claudia", estado: "confirmado" },
  { tipoTurno: "Prequirúrgico", hora: "12:00", paciente: "Juan Pérez", estado: "confirmado" },
  { tipoTurno: "Cirugía", hora: "12:30", paciente: "Daniel", estado: "pendiente" },
  { tipoTurno: "Tratamiento", hora: "13:00", paciente: "Alfredo", estado: "confirmado" },
  { tipoTurno: "Consulta", hora: "13:30", paciente: "Julian", estado: "cancelado" },
  { tipoTurno: "Primera vez", hora: "14:00", paciente: "Claudia", estado: "confirmado" },
]

export default function UpcomingAppointments() {
  return (
    <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden max-h-[492px] mt-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-800">
          Próximos turnos del día
        </CardTitle>
      </CardHeader>

      <CardContent className="overflow-scroll p-0">
        <div className="overflow-y-auto max-h-[492px]">
          <table className="w-full text-sm text-left border-t border-gray-100">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 font-medium">Horario</th>
                <th className="px-4 py-2 font-medium">Paciente</th>
                <th className="px-4 py-2 font-medium">Tipo de Turno</th>
                <th className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-100 hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-2 font-medium text-gray-800">
                    {a.hora}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{a.paciente}</td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        a.tipoTurno === "Cirugía"
                          ? "bg-red-100 text-red-600"
                          : a.tipoTurno === "Prequirúrgico"
                          ? "bg-orange-100 text-orange-600"
                          : a.tipoTurno === "Primera vez"
                          ? "bg-indigo-100 text-indigo-600"
                          : a.tipoTurno === "Tratamiento"
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {a.tipoTurno}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          a.estado === "confirmado"
                            ? "bg-green-500"
                            : a.estado === "pendiente"
                            ? "bg-yellow-500"
                            : "bg-gray-400"
                        }`}
                      ></span>

                      <span
                        className={`text-xs font-medium ${
                          a.estado === "confirmado"
                            ? "text-green-600"
                            : a.estado === "pendiente"
                            ? "text-yellow-600"
                            : "text-gray-600"
                        }`}
                      >
                        {a.estado === "confirmado"
                          ? "Confirmado"
                          : a.estado === "pendiente"
                          ? "Pendiente"
                          : "Cancelado"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

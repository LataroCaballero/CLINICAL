"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Check, X } from "lucide-react";

// Utilidad para formatear fecha
const formatDate = (dateString?: string | null) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("es-AR");
};

export const pacienteColumns: ColumnDef<any>[] = [
  // NOMBRE COMPLETO
  {
    accessorKey: "nombreCompleto",
    header: "Nombre",
    cell: ({ row }) => {
      const nombre = row.original.nombreCompleto;
      const foto = row.original.fotoUrl;

      const getInitial = (name?: string) =>
        name ? name.charAt(0).toUpperCase() : "?";

      return (
        <div className="flex items-center gap-3">
          {foto ? (
            <img
              src={foto}
              alt={nombre}
              className="h-9 w-9 rounded-full object-cover border"
            />
          ) : (
            <div
              className="
              h-9 w-9 rounded-full bg-indigo-600 text-white
              flex items-center justify-center
              text-sm font-semibold
            "
            >
              {getInitial(nombre)}
            </div>
          )}

          <span className="font-medium text-gray-900">{nombre}</span>
        </div>
      );
    },
  },

  // OBRA SOCIAL (resuelta desde backend o incluida en row.original)
  {
    accessorKey: "obraSocialNombre",
    header: "Obra social",
    cell: ({ row }) => row.original.obraSocialNombre || "Sin obra social",
  },

  // DIAGNOSTICO
  {
    accessorKey: "diagnostico",
    header: "Diagnóstico",
    cell: ({ row }) => row.original.diagnostico || "-",
  },

  // TRATAMIENTO
  {
    accessorKey: "tratamiento",
    header: "Tratamiento",
    cell: ({ row }) => row.original.tratamiento || "-",
  },

  // LUGAR INTERVENCIÓN
  {
    accessorKey: "lugarIntervencion",
    header: "Lugar intervención",
    cell: ({ row }) => row.original.lugarIntervencion || "-",
  },

  // CONSENTIMIENTO FIRMADO
  {
    accessorKey: "consentimientoFirmado",
    header: "Consentimiento",
    cell: ({ row }) => {
      const value = row.original.consentimientoFirmado;
      return value ? (
        <Check className="text-green-600 w-5 h-5" />
      ) : (
        <X className="text-red-600 w-5 h-5" />
      );
    },
  },

  // INDICACIONES ENVIADAS + FECHA
  {
    accessorKey: "indicacionesEnviadas",
    header: "Indicaciones",
    cell: ({ row }) => {
      const enviado = row.original.indicacionesEnviadas;
      const fecha = row.original.fechaIndicaciones;

      return (
        <div className="flex items-center gap-2">
          {enviado ? (
            <Check className="text-green-600 w-5 h-5" />
          ) : (
            <X className="text-red-600 w-5 h-5" />
          )}

          {enviado && (
            <span className="text-xs text-gray-600">{formatDate(fecha)}</span>
          )}
        </div>
      );
    },
  },

  // ESTADO
  {
    accessorKey: "estado",
    header: "Estado",
    filterFn: "equals",
    cell: ({ row }) => {
      const estado = row.original.estado;

      const map: Record<string, string> = {
        ACTIVO: "bg-green-100 text-green-700",
        ARCHIVADO: "bg-gray-200 text-gray-700",
        QUIRURGICO: "bg-blue-100 text-blue-700",
        PRESUPUESTO: "bg-yellow-100 text-yellow-700",
        PRIMERA: "bg-indigo-100 text-indigo-700",
        PRACTICA_CONSULTORIO: "bg-purple-100 text-purple-700",
      };

      const style = map[estado] ?? "bg-gray-100 text-gray-700";

      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${style}`}>
          {estado.replace(/_/g, " ")}
        </span>
      );
    },
  },

  // ÚLTIMO TURNO
  {
    accessorKey: "ultimoTurno",
    header: "Último turno",
    cell: ({ row }) => {
      const turno = row.original.ultimoTurno;
      return turno ? formatDate(turno) : "-";
    },
  },

  // PRÓXIMO TURNO
  {
    accessorKey: "proximoTurno",
    header: "Próximo turno",
    cell: ({ row }) => {
      const turno = row.original.proximoTurno;
      return turno ? formatDate(turno) : "-";
    },
  },

  // DEUDA
  {
    accessorKey: "deuda",
    header: "Deuda",
    cell: ({ row }) => {
      const deuda = row.original.deuda || 0;

      return deuda > 0 ? (
        <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">
          Deudor (${deuda})
        </span>
      ) : (
        <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
          Sin deuda
        </span>
      );
    },
  },
];

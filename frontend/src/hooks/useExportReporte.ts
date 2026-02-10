import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TipoReporte, FormatoExportacion, ReporteFilters } from "@/types/reportes";

interface ExportOptions {
  tipoReporte: TipoReporte;
  formato: FormatoExportacion;
  filtros?: ReporteFilters;
  titulo?: string;
}

interface UseExportReporteOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useExportReporte(options?: UseExportReporteOptions) {
  return useMutation({
    mutationFn: async (exportOptions: ExportOptions) => {
      const response = await api.post("/reportes/exportar", exportOptions, {
        responseType: "blob",
      });

      // Obtener filename del header o usar uno por defecto
      const contentDisposition = response.headers["content-disposition"];
      let filename = `reporte-${exportOptions.tipoReporte}.${exportOptions.formato}`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      // Crear blob y descargar
      const blob = new Blob([response.data], {
        type: getMimeType(exportOptions.formato),
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { filename };
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

function getMimeType(formato: FormatoExportacion): string {
  switch (formato) {
    case "json":
      return "application/json";
    case "csv":
      return "text/csv";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

// Hook simplificado para exportar rápidamente
export function useQuickExport() {
  const { mutate, isPending } = useExportReporte();

  const exportar = (
    tipoReporte: TipoReporte,
    formato: FormatoExportacion,
    filtros?: ReporteFilters
  ) => {
    mutate({ tipoReporte, formato, filtros });
  };

  return { exportar, isExporting: isPending };
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Download, FileJson, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useExportReporte } from "@/hooks/useExportReporte";
import { TipoReporte, FormatoExportacion, ReporteFilters } from "@/types/reportes";
import { toast } from "sonner";

interface ExportButtonProps {
  tipoReporte: TipoReporte;
  filtros?: ReporteFilters;
  titulo?: string;
  disabled?: boolean;
  showPdf?: boolean;
}

export function ExportButton({
  tipoReporte,
  filtros,
  titulo,
  disabled = false,
  showPdf = false,
}: ExportButtonProps) {
  const [formatoExportando, setFormatoExportando] = useState<FormatoExportacion | null>(null);

  const { mutate: exportar, isPending } = useExportReporte({
    onSuccess: () => {
      toast.success("Reporte exportado correctamente");
      setFormatoExportando(null);
    },
    onError: (error) => {
      toast.error(`Error al exportar: ${error.message}`);
      setFormatoExportando(null);
    },
  });

  const handleExport = (formato: FormatoExportacion) => {
    setFormatoExportando(formato);
    exportar({ tipoReporte, formato, filtros, titulo });
  };

  const isExporting = isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || isExporting}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Formato de exportación</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleExport("json")}
          disabled={isExporting}
        >
          <FileJson className="w-4 h-4 mr-2 text-amber-600" />
          <span>JSON</span>
          {formatoExportando === "json" && (
            <Loader2 className="w-4 h-4 ml-auto animate-spin" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("csv")}
          disabled={isExporting}
        >
          <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
          <span>CSV (Excel)</span>
          {formatoExportando === "csv" && (
            <Loader2 className="w-4 h-4 ml-auto animate-spin" />
          )}
        </DropdownMenuItem>
        {showPdf && (
          <DropdownMenuItem
            onClick={() => handleExport("pdf")}
            disabled={isExporting}
          >
            <FileText className="w-4 h-4 mr-2 text-red-600" />
            <span>PDF</span>
            {formatoExportando === "pdf" && (
              <Loader2 className="w-4 h-4 ml-auto animate-spin" />
            )}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Versión compacta para usar en headers de tablas
interface ExportIconButtonProps {
  tipoReporte: TipoReporte;
  filtros?: ReporteFilters;
  formato?: FormatoExportacion;
}

export function ExportIconButton({
  tipoReporte,
  filtros,
  formato = "csv",
}: ExportIconButtonProps) {
  const { mutate: exportar, isPending } = useExportReporte({
    onSuccess: () => toast.success("Reporte exportado"),
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => exportar({ tipoReporte, formato, filtros })}
      disabled={isPending}
      title={`Exportar a ${formato.toUpperCase()}`}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
    </Button>
  );
}

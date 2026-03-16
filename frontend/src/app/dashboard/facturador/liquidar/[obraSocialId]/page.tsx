"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfessionalContext } from "@/store/professional-context.store";
import {
  usePracticasPendientesPorOS,
  type PracticaPendientePorOS,
} from "@/hooks/usePracticasPendientesPorOS";
import { useActualizarMontoPagado } from "@/hooks/useActualizarMontoPagado";
import { useCerrarLote } from "@/hooks/useCerrarLote";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface EditableCellProps {
  practica: PracticaPendientePorOS;
  onSuccess: (practicaId: string, newMonto: number) => void;
}

function EditableCell({ practica, onSuccess }: EditableCellProps) {
  const [localMonto, setLocalMonto] = useState("");
  const actualizarMonto = useActualizarMontoPagado();

  const handleBlur = () => {
    if (localMonto === "") return;
    const parsed = parseFloat(localMonto);
    if (isNaN(parsed)) return;
    const currentValue = practica.montoPagado ?? practica.monto;
    if (parsed === currentValue) return;

    actualizarMonto.mutate(
      { practicaId: practica.id, montoPagado: parsed },
      {
        onSuccess: () => onSuccess(practica.id, parsed),
        onError: () => {
          setLocalMonto("");
          toast.error("Error al guardar el monto");
        },
      }
    );
  };

  return (
    <Input
      type="number"
      min="0"
      step="1"
      value={localMonto}
      placeholder={formatMoney(practica.montoPagado ?? practica.monto)}
      onChange={(e) => setLocalMonto(e.target.value)}
      onBlur={handleBlur}
      className="w-32 text-right ml-auto"
    />
  );
}

export default function LotePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const obraSocialId = params.obraSocialId as string;
  const osNombre = searchParams.get("nombre") ?? "Obra Social";

  const { selectedProfessionalId } = useProfessionalContext();
  const { data: practicas, isLoading } = usePracticasPendientesPorOS(
    selectedProfessionalId,
    obraSocialId
  );
  const cerrarLote = useCerrarLote();

  const [overrides, setOverrides] = useState<Map<string, number>>(new Map());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOverride = (practicaId: string, newMonto: number) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(practicaId, newMonto);
      return next;
    });
  };

  const derivedTotal = (practicas ?? []).reduce((sum, p) => {
    return sum + (overrides.get(p.id) ?? p.montoPagado ?? p.monto);
  }, 0);

  const handleConfirmarCierre = () => {
    if (!selectedProfessionalId || !practicas) return;
    cerrarLote.mutate({
      profesionalId: selectedProfessionalId,
      obraSocialId,
      practicaIds: practicas.map((p) => p.id),
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b bg-white sticky top-0 z-10">
        <Link
          href="/dashboard/facturador"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Volver
        </Link>
        <h1 className="text-lg font-semibold flex-1">{osNombre}</h1>
        <span className="text-sm text-muted-foreground">
          Total:{" "}
          <span className="font-semibold text-foreground">
            {formatMoney(derivedTotal)}
          </span>
        </span>
        <Button
          variant="default"
          disabled={!practicas || practicas.length === 0 || cerrarLote.isPending}
          onClick={() => setIsModalOpen(true)}
        >
          Cerrar Lote
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : practicas?.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No hay prácticas pendientes para esta obra social.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="pb-2 pr-4 font-medium">Paciente</th>
                <th className="pb-2 pr-4 font-medium">Código</th>
                <th className="pb-2 pr-4 font-medium">Descripción</th>
                <th className="pb-2 pr-4 font-medium">Fecha</th>
                <th className="pb-2 pr-4 font-medium text-right">Autorizado</th>
                <th className="pb-2 font-medium text-right">Pagado</th>
              </tr>
            </thead>
            <tbody>
              {practicas?.map((practica) => (
                <tr key={practica.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-4">
                    {practica.paciente?.nombreCompleto ?? "—"}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{practica.codigo}</td>
                  <td className="py-2 pr-4 max-w-xs truncate">{practica.descripcion}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {new Date(practica.fecha).toLocaleDateString("es-AR")}
                  </td>
                  <td className="py-2 pr-4 text-right">{formatMoney(practica.monto)}</td>
                  <td className="py-2 text-right">
                    <EditableCell
                      practica={practica}
                      onSuccess={handleOverride}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cerrar Lote Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cerrar lote?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se marcarán{" "}
            <span className="font-semibold text-foreground">
              {practicas?.length ?? 0} prácticas
            </span>{" "}
            como PAGADO por un total de{" "}
            <span className="font-semibold text-foreground">
              {formatMoney(derivedTotal)}
            </span>
            .
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={cerrarLote.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmarCierre}
              disabled={cerrarLote.isPending}
            >
              {cerrarLote.isPending ? "Cerrando..." : "Confirmar cierre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCuentaCorriente,
  useMovimientosCC,
  useCreateMovimiento,
} from "@/hooks/useCuentaCorriente";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Props = {
  pacienteId: string;
  onBack: () => void;
};

export default function CuentaCorrienteView({ pacienteId, onBack }: Props) {
  const { data: cuenta, isLoading: loadingCuenta } =
    useCuentaCorriente(pacienteId);
  const { data: movimientos = [], isLoading: loadingMovimientos } =
    useMovimientosCC(pacienteId);
  const createMovimiento = useCreateMovimiento();

  const [openPagoModal, setOpenPagoModal] = useState(false);
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const handleRegistrarPago = async () => {
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) return;

    await createMovimiento.mutateAsync({
      pacienteId,
      data: {
        monto: montoNum,
        tipo: "PAGO",
        descripcion: descripcion || undefined,
      },
    });

    setMonto("");
    setDescripcion("");
    setOpenPagoModal(false);
  };

  const isLoading = loadingCuenta || loadingMovimientos;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Volver
        </Button>
        <h2 className="text-lg font-semibold">Cuenta Corriente</h2>
        <Button onClick={() => setOpenPagoModal(true)}>Registrar pago</Button>
      </div>

      {/* Estado de carga */}
      {isLoading && <p>Cargando cuenta corriente...</p>}

      {/* Card de saldo */}
      {cuenta && !isLoading && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${
                cuenta.saldoActual > 0
                  ? "text-red-600"
                  : cuenta.saldoActual < 0
                  ? "text-green-600"
                  : "text-gray-900"
              }`}
            >
              ${cuenta.saldoActual.toLocaleString("es-AR")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Total pagado historico: $
              {cuenta.totalPagadoHistorico.toLocaleString("es-AR")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Listado de movimientos */}
      <div className="space-y-2">
        <h3 className="font-medium text-sm text-muted-foreground">
          Movimientos
        </h3>

        {!isLoading && movimientos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay movimientos registrados.
          </p>
        )}

        <div className="space-y-2">
          {movimientos.map((mov) => (
            <div
              key={mov.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={mov.tipo === "CARGO" ? "destructive" : "default"}
                    className={
                      mov.tipo === "PAGO"
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : ""
                    }
                  >
                    {mov.tipo}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(mov.fecha), "dd/MM/yyyy HH:mm", {
                      locale: es,
                    })}
                  </span>
                </div>
                {mov.descripcion && (
                  <p className="text-sm mt-1">{mov.descripcion}</p>
                )}
                {mov.presupuesto && (
                  <p className="text-xs text-muted-foreground">
                    Presupuesto - Total: ${mov.presupuesto.total.toLocaleString("es-AR")}
                  </p>
                )}
                {mov.turno && (
                  <p className="text-xs text-muted-foreground">
                    Turno del{" "}
                    {format(new Date(mov.turno.inicio), "dd/MM/yyyy HH:mm", {
                      locale: es,
                    })}
                  </p>
                )}
              </div>
              <span
                className={`font-semibold ${
                  mov.tipo === "CARGO" ? "text-red-600" : "text-green-600"
                }`}
              >
                {mov.tipo === "CARGO" ? "+" : "-"}$
                {mov.monto.toLocaleString("es-AR")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal registrar pago */}
      <Dialog open={openPagoModal} onOpenChange={setOpenPagoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="monto">Monto</Label>
              <Input
                id="monto"
                type="number"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripcion (opcional)</Label>
              <Input
                id="descripcion"
                placeholder="Ej: Pago en efectivo"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPagoModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRegistrarPago}
              disabled={createMovimiento.isPending || !monto}
            >
              {createMovimiento.isPending ? "Registrando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

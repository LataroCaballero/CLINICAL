"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Plus,
  Download,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Calendar,
  Wallet,
  CreditCard,
  Banknote,
  ArrowUpDown,
} from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";
import Link from "next/link";
import {
  useCuentaCorrienteDetalle,
  useMovimientosCC,
  useAntiguedadDeuda,
} from "@/hooks/useFinanzas";
import { usePaciente } from "@/hooks/usePaciente";
import { MedioPago, TipoMovimiento } from "@/types/finanzas";
import RegistrarPagoModal from "@/app/dashboard/finanzas/balance/components/RegistrarPagoModal";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const MEDIO_PAGO_ICONS: Record<MedioPago, React.ReactNode> = {
  [MedioPago.EFECTIVO]: <Banknote className="w-4 h-4 text-emerald-500" />,
  [MedioPago.TRANSFERENCIA]: <Wallet className="w-4 h-4 text-blue-500" />,
  [MedioPago.TARJETA_DEBITO]: <CreditCard className="w-4 h-4 text-purple-500" />,
  [MedioPago.TARJETA_CREDITO]: <CreditCard className="w-4 h-4 text-indigo-500" />,
  [MedioPago.MERCADO_PAGO]: <Wallet className="w-4 h-4 text-sky-500" />,
  [MedioPago.OTRO]: <Wallet className="w-4 h-4 text-gray-500" />,
};

const MEDIO_PAGO_LABELS: Record<MedioPago, string> = {
  [MedioPago.EFECTIVO]: "Efectivo",
  [MedioPago.TRANSFERENCIA]: "Transferencia",
  [MedioPago.TARJETA_DEBITO]: "Débito",
  [MedioPago.TARJETA_CREDITO]: "Crédito",
  [MedioPago.MERCADO_PAGO]: "Mercado Pago",
  [MedioPago.OTRO]: "Otro",
};

type SortField = "fecha" | "tipo" | "monto";

export default function CuentaCorrientePacientePage() {
  const params = useParams();
  const router = useRouter();
  const pacienteId = params.id as string;

  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<SortField>("fecha");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: paciente, isLoading: loadingPaciente } = usePaciente(pacienteId);
  const { data: cuenta, isLoading: loadingCuenta, refetch: refetchCuenta } = useCuentaCorrienteDetalle(pacienteId);
  const { data: movimientos, isLoading: loadingMovimientos, refetch: refetchMovimientos } = useMovimientosCC(pacienteId);
  const { data: antiguedad, isLoading: loadingAntiguedad } = useAntiguedadDeuda(pacienteId);

  const isLoading = loadingPaciente || loadingCuenta || loadingMovimientos;

  const handlePagoSuccess = () => {
    refetchCuenta();
    refetchMovimientos();
    setPagoModalOpen(false);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  // Ordenamiento de movimientos
  const sortedMovimientos = [...(movimientos || [])].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "fecha":
        comparison = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
        break;
      case "tipo":
        comparison = a.tipo.localeCompare(b.tipo);
        break;
      case "monto":
        comparison = a.monto - b.monto;
        break;
    }
    return sortDir === "asc" ? comparison : -comparison;
  });

  // Paginación
  const totalPages = Math.ceil(sortedMovimientos.length / pageSize);
  const paginatedMovimientos = sortedMovimientos.slice((page - 1) * pageSize, page * pageSize);

  const saldoActual = cuenta?.saldoActual ?? 0;
  const totalPagado = cuenta?.totalPagadoHistorico ?? 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              Cuenta Corriente
            </h1>
            {loadingPaciente ? (
              <Skeleton className="h-5 w-48 mt-1" />
            ) : (
              <p className="text-sm text-gray-500 mt-1">
                {paciente?.nombreCompleto} - DNI: {paciente?.dni}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button size="sm" onClick={() => setPagoModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Registrar Pago
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Saldo Actual</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p
                    className={`text-2xl font-semibold ${
                      saldoActual > 0 ? "text-red-600" : saldoActual < 0 ? "text-emerald-600" : "text-gray-600"
                    }`}
                  >
                    {formatMoney(saldoActual)}
                  </p>
                )}
              </div>
              {saldoActual > 0 ? (
                <AlertTriangle className="w-8 h-8 text-red-200" />
              ) : (
                <CheckCircle2 className="w-8 h-8 text-emerald-200" />
              )}
            </div>
            {saldoActual > 0 && (
              <Badge
                variant="outline"
                className="mt-2 bg-red-50 text-red-700 border-red-200"
              >
                Saldo pendiente
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Pagado (histórico)</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className="text-2xl font-semibold text-gray-800">
                    {formatMoney(totalPagado)}
                  </p>
                )}
              </div>
              <Wallet className="w-8 h-8 text-gray-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Movimientos</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-semibold text-gray-800">
                    {movimientos?.length ?? 0}
                  </p>
                )}
              </div>
              <FileText className="w-8 h-8 text-gray-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Antigüedad de Deuda */}
      {saldoActual > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Antigüedad de Deuda
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAntiguedad ? (
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : antiguedad ? (
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-xs text-emerald-600 font-medium">0-30 días</p>
                  <p className="text-lg font-semibold text-emerald-700">
                    {formatMoney(antiguedad["0-30"])}
                  </p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-xs text-amber-600 font-medium">31-60 días</p>
                  <p className="text-lg font-semibold text-amber-700">
                    {formatMoney(antiguedad["31-60"])}
                  </p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-orange-600 font-medium">61-90 días</p>
                  <p className="text-lg font-semibold text-orange-700">
                    {formatMoney(antiguedad["61-90"])}
                  </p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-600 font-medium">+90 días</p>
                  <p className="text-lg font-semibold text-red-700">
                    {formatMoney(antiguedad["90+"])}
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Timeline de Movimientos */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Movimientos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingMovimientos ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !movimientos || movimientos.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay movimientos registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("fecha")}
                  >
                    <div className="flex items-center gap-2">
                      Fecha
                      {sortField === "fecha" && <ArrowUpDown className="w-4 h-4" />}
                    </div>
                  </TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Medio</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort("monto")}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Monto
                      {sortField === "monto" && <ArrowUpDown className="w-4 h-4" />}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMovimientos.map((mov) => {
                  const isPago = mov.tipo === TipoMovimiento.PAGO;
                  return (
                    <TableRow
                      key={mov.id}
                      className={mov.anulado ? "opacity-50 bg-gray-50" : ""}
                    >
                      <TableCell>
                        {isPago ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                            <ArrowUpCircle className="w-4 h-4 text-red-600" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {formatDateTime(mov.fecha)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {mov.descripcion || (isPago ? "Pago recibido" : "Cargo")}
                          </p>
                          {mov.turno && (
                            <p className="text-xs text-gray-500">
                              Turno: {mov.turno.tipoTurno?.nombre}
                            </p>
                          )}
                          {mov.presupuesto && (
                            <p className="text-xs text-gray-500">
                              Presupuesto #{mov.presupuesto.id.slice(0, 8)}
                            </p>
                          )}
                          {mov.anulado && (
                            <Badge variant="outline" className="mt-1 text-xs bg-gray-100">
                              Anulado
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {mov.referencia || "-"}
                      </TableCell>
                      <TableCell>
                        {isPago && mov.medioPago ? (
                          <div className="flex items-center gap-1">
                            {MEDIO_PAGO_ICONS[mov.medioPago]}
                            <span className="text-sm">
                              {MEDIO_PAGO_LABELS[mov.medioPago]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          isPago ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {isPago ? "-" : "+"}
                        {formatMoney(mov.monto)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {!loadingMovimientos && sortedMovimientos.length > 0 && (
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={sortedMovimientos.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Modal de Pago */}
      <RegistrarPagoModal
        open={pagoModalOpen}
        onOpenChange={setPagoModalOpen}
        pacienteId={pacienteId}
        onSuccess={handlePagoSuccess}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Filter,
  Download,
  Plus,
  AlertTriangle,
  Building2,
  User,
  Receipt,
  ArrowUpDown,
} from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";
import { useFacturas, useCreateFactura } from "@/hooks/useFinanzas";
import { TipoFactura, EstadoFactura, FacturasFilters } from "@/types/finanzas";
import { toast } from "sonner";

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
    month: "short",
    year: "numeric",
  });
}

const TIPO_BADGE: Record<TipoFactura, { label: string; className: string }> = {
  [TipoFactura.FACTURA]: {
    label: "Factura",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  [TipoFactura.RECIBO]: {
    label: "Recibo",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

const ESTADO_BADGE: Record<EstadoFactura, { label: string; className: string }> = {
  [EstadoFactura.EMITIDA]: {
    label: "Emitida",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  [EstadoFactura.ANULADA]: {
    label: "Anulada",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

type SortField = "fecha" | "numero" | "receptor" | "total";

export default function ComprobantesTab() {
  const [filters, setFilters] = useState<FacturasFilters>({});
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<SortField>("fecha");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: facturas, isLoading, error, refetch } = useFacturas(filters);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const filteredFacturas = (facturas || []).filter((f) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        f.numero.toLowerCase().includes(searchLower) ||
        f.razonSocial?.toLowerCase().includes(searchLower) ||
        f.paciente?.nombreCompleto?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Ordenamiento
  const sortedFacturas = [...filteredFacturas].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "fecha":
        comparison = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
        break;
      case "numero":
        comparison = a.numero.localeCompare(b.numero);
        break;
      case "receptor":
        const receptorA = a.obraSocial?.nombre || a.paciente?.nombreCompleto || a.razonSocial || "";
        const receptorB = b.obraSocial?.nombre || b.paciente?.nombreCompleto || b.razonSocial || "";
        comparison = receptorA.localeCompare(receptorB);
        break;
      case "total":
        comparison = a.total - b.total;
        break;
    }
    return sortDir === "asc" ? comparison : -comparison;
  });

  // Paginación
  const totalPages = Math.ceil(sortedFacturas.length / pageSize);
  const paginatedFacturas = sortedFacturas.slice((page - 1) * pageSize, page * pageSize);

  const totalFacturado = filteredFacturas
    .filter((f) => f.estado !== EstadoFactura.ANULADA)
    .reduce((sum, f) => sum + f.total, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Comprobante
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Total Facturado</p>
            <p className="text-2xl font-semibold text-gray-800">
              {formatMoney(totalFacturado)}
            </p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Comprobantes</p>
            <p className="text-2xl font-semibold text-gray-800">
              {filteredFacturas.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Emitidas este mes</p>
            <p className="text-2xl font-semibold text-emerald-600">
              {
                filteredFacturas.filter((f) => {
                  const fecha = new Date(f.fecha);
                  const now = new Date();
                  return (
                    fecha.getMonth() === now.getMonth() &&
                    fecha.getFullYear() === now.getFullYear()
                  );
                }).length
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border shadow-sm">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por número, razón social o paciente..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                className="w-[150px]"
                value={filters.fechaDesde || ""}
                onChange={(e) =>
                  setFilters({ ...filters, fechaDesde: e.target.value || undefined })
                }
              />
              <Input
                type="date"
                className="w-[150px]"
                value={filters.fechaHasta || ""}
                onChange={(e) =>
                  setFilters({ ...filters, fechaHasta: e.target.value || undefined })
                }
              />
            </div>
            <Select
              value={filters.tipo || "TODOS"}
              onValueChange={(v) =>
                setFilters({
                  ...filters,
                  tipo: v === "TODOS" ? undefined : (v as TipoFactura),
                })
              }
            >
              <SelectTrigger className="w-full md:w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value={TipoFactura.FACTURA}>Factura</SelectItem>
                <SelectItem value={TipoFactura.RECIBO}>Recibo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-gray-600">Error al cargar los comprobantes</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          ) : filteredFacturas.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron comprobantes</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Emitir primer comprobante
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("numero")}
                  >
                    <div className="flex items-center gap-2">
                      Número
                      {sortField === "numero" && <ArrowUpDown className="w-4 h-4" />}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("fecha")}
                  >
                    <div className="flex items-center gap-2">
                      Fecha
                      {sortField === "fecha" && <ArrowUpDown className="w-4 h-4" />}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("receptor")}
                  >
                    <div className="flex items-center gap-2">
                      Receptor
                      {sortField === "receptor" && <ArrowUpDown className="w-4 h-4" />}
                    </div>
                  </TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort("total")}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Total
                      {sortField === "total" && <ArrowUpDown className="w-4 h-4" />}
                    </div>
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFacturas.map((factura) => (
                  <TableRow
                    key={factura.id}
                    className={factura.estado === EstadoFactura.ANULADA ? "opacity-50" : ""}
                  >
                    <TableCell>
                      <Badge variant="outline" className={TIPO_BADGE[factura.tipo].className}>
                        {TIPO_BADGE[factura.tipo].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{factura.numero}</TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(factura.fecha)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {factura.obraSocial ? (
                          <>
                            <Building2 className="w-4 h-4 text-blue-500" />
                            <div>
                              <p className="font-medium">{factura.obraSocial.nombre}</p>
                              {factura.cuit && (
                                <p className="text-xs text-gray-500">CUIT: {factura.cuit}</p>
                              )}
                            </div>
                          </>
                        ) : factura.paciente ? (
                          <>
                            <User className="w-4 h-4 text-gray-500" />
                            <p className="font-medium">{factura.paciente.nombreCompleto}</p>
                          </>
                        ) : (
                          <>
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium">{factura.razonSocial || "-"}</p>
                              {factura.cuit && (
                                <p className="text-xs text-gray-500">CUIT: {factura.cuit}</p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-gray-500">
                      {factura.concepto || "-"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMoney(factura.total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={ESTADO_BADGE[factura.estado].className}
                      >
                        {ESTADO_BADGE[factura.estado].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && !error && sortedFacturas.length > 0 && (
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={sortedFacturas.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Modal Crear Comprobante */}
      <CreateComprobanteModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => {
          refetch();
          setCreateModalOpen(false);
        }}
      />
    </div>
  );
}

// Modal para crear comprobante
function CreateComprobanteModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    tipo: TipoFactura.FACTURA,
    segmento: "particular" as "particular" | "obra_social" | "clinica",
    razonSocial: "",
    cuit: "",
    domicilio: "",
    condicionIVA: "",
    concepto: "",
    subtotal: "",
    impuestos: "",
  });

  const createFactura = useCreateFactura();

  const handleSubmit = async () => {
    const subtotal = parseFloat(form.subtotal) || 0;
    const impuestos = parseFloat(form.impuestos) || 0;

    if (subtotal <= 0) {
      toast.error("El subtotal debe ser mayor a 0");
      return;
    }

    try {
      await createFactura.mutateAsync({
        tipo: form.tipo,
        razonSocial: form.razonSocial || undefined,
        cuit: form.cuit || undefined,
        domicilio: form.domicilio || undefined,
        condicionIVA: form.condicionIVA || undefined,
        concepto: form.concepto || undefined,
        subtotal,
        impuestos,
        total: subtotal + impuestos,
      });
      toast.success("Comprobante creado correctamente");
      onSuccess();
    } catch (error) {
      toast.error("Error al crear el comprobante");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo Comprobante</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Comprobante</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm({ ...form, tipo: v as TipoFactura })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TipoFactura.FACTURA}>Factura</SelectItem>
                  <SelectItem value={TipoFactura.RECIBO}>Recibo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Segmento</Label>
              <Select
                value={form.segmento}
                onValueChange={(v) =>
                  setForm({ ...form, segmento: v as typeof form.segmento })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="particular">Particular</SelectItem>
                  <SelectItem value="obra_social">Obra Social</SelectItem>
                  <SelectItem value="clinica">Clínica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Razón Social</Label>
            <Input
              value={form.razonSocial}
              onChange={(e) => setForm({ ...form, razonSocial: e.target.value })}
              placeholder="Nombre o razón social"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>CUIT</Label>
              <Input
                value={form.cuit}
                onChange={(e) => setForm({ ...form, cuit: e.target.value })}
                placeholder="XX-XXXXXXXX-X"
              />
            </div>
            <div>
              <Label>Condición IVA</Label>
              <Select
                value={form.condicionIVA}
                onValueChange={(v) => setForm({ ...form, condicionIVA: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="responsable_inscripto">Responsable Inscripto</SelectItem>
                  <SelectItem value="monotributista">Monotributista</SelectItem>
                  <SelectItem value="exento">Exento</SelectItem>
                  <SelectItem value="consumidor_final">Consumidor Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Domicilio</Label>
            <Input
              value={form.domicilio}
              onChange={(e) => setForm({ ...form, domicilio: e.target.value })}
              placeholder="Dirección fiscal"
            />
          </div>

          <div>
            <Label>Concepto</Label>
            <Textarea
              value={form.concepto}
              onChange={(e) => setForm({ ...form, concepto: e.target.value })}
              placeholder="Descripción del servicio facturado"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Subtotal</Label>
              <Input
                type="number"
                value={form.subtotal}
                onChange={(e) => setForm({ ...form, subtotal: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Impuestos (IVA)</Label>
              <Input
                type="number"
                value={form.impuestos}
                onChange={(e) => setForm({ ...form, impuestos: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          {(form.subtotal || form.impuestos) && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatMoney(parseFloat(form.subtotal) || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Impuestos:</span>
                <span>{formatMoney(parseFloat(form.impuestos) || 0)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t mt-2">
                <span>Total:</span>
                <span>
                  {formatMoney(
                    (parseFloat(form.subtotal) || 0) + (parseFloat(form.impuestos) || 0)
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createFactura.isPending}>
            {createFactura.isPending ? "Creando..." : "Crear Comprobante"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

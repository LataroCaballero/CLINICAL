"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  Plus,
  Building2,
  AlertTriangle,
  Pencil,
  Trash2,
} from "lucide-react";
import { useProveedores, useDeleteProveedor } from "@/hooks/useProveedores";
import { Proveedor } from "@/types/stock";
import NewProveedorModal from "./components/NewProveedorModal";
import EditProveedorModal from "./components/EditProveedorModal";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProveedoresPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(
    null
  );

  const { data: proveedores, isLoading, error, refetch } = useProveedores();
  const deleteProveedor = useDeleteProveedor();

  const handleEdit = (proveedor: Proveedor) => {
    setSelectedProveedor(proveedor);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (proveedor: Proveedor) => {
    setSelectedProveedor(proveedor);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProveedor) return;
    try {
      await deleteProveedor.mutateAsync(selectedProveedor.id);
      toast.success("Proveedor eliminado");
      setDeleteDialogOpen(false);
    } catch {
      toast.error("Error al eliminar el proveedor");
    }
  };

  const filteredProveedores = proveedores?.filter((p) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(search) ||
      p.cuit?.includes(searchTerm) ||
      p.email?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Proveedores</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona los proveedores de productos e insumos
          </p>
        </div>
        <Button
          className="bg-indigo-600 text-white hover:bg-indigo-700"
          onClick={() => setNewModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Search */}
      <Card className="border shadow-sm">
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, CUIT o email..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
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
              <p className="text-gray-600">Error al cargar los proveedores</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => refetch()}
              >
                Reintentar
              </Button>
            </div>
          ) : filteredProveedores?.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron proveedores</p>
              {!searchTerm && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setNewModalOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar primer proveedor
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>CUIT</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProveedores?.map((proveedor) => (
                  <TableRow key={proveedor.id}>
                    <TableCell className="font-medium">
                      {proveedor.nombre}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {proveedor.cuit || "-"}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {proveedor.telefono || "-"}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {proveedor.email || "-"}
                    </TableCell>
                    <TableCell className="text-gray-500 max-w-[200px] truncate">
                      {proveedor.direccion || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(proveedor)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteClick(proveedor)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resumen */}
      {!isLoading && filteredProveedores && filteredProveedores.length > 0 && (
        <div className="text-sm text-gray-500">
          Mostrando {filteredProveedores.length} proveedor
          {filteredProveedores.length !== 1 && "es"}
        </div>
      )}

      {/* Modals */}
      <NewProveedorModal
        open={newModalOpen}
        onOpenChange={setNewModalOpen}
        onSuccess={() => {
          refetch();
          setNewModalOpen(false);
        }}
      />

      <EditProveedorModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        proveedor={selectedProveedor}
        onSuccess={() => {
          refetch();
          setEditModalOpen(false);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el proveedor "
              {selectedProveedor?.nombre}" permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

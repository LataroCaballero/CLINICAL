'use client';

import { useState } from 'react';
import { InsumosEditor, type InsumoLocal } from './InsumosEditor';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  useCirugiasCatalogo,
  useCreateCirugiaCatalogo,
  useUpdateCirugiaCatalogo,
  useDeleteCirugiaCatalogo,
  useSetInsumosCirugia,
  useRecalcularPrecioCirugia,
} from '@/hooks/useCirugiasCatalogo';
import type { CirugiaCatalogo } from '@/types/cirugia-catalogo';

interface GestionCirugiaProps {
  profesionalId?: string;
}

interface CirugiaFormData {
  nombre: string;
  precioARS: string;
  precioUSD: string;
  duracionMinutos: string;
}

const emptyFormData: CirugiaFormData = {
  nombre: '',
  precioARS: '',
  precioUSD: '',
  duracionMinutos: '',
};

export default function GestionCirugias({ profesionalId }: GestionCirugiaProps = {}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCirugia, setEditingCirugia] = useState<CirugiaCatalogo | null>(null);
  const [formData, setFormData] = useState<CirugiaFormData>(emptyFormData);
  const [insumosLocal, setInsumosLocal] = useState<InsumoLocal[]>([]);

  const { data: cirugias, isLoading, error } = useCirugiasCatalogo(profesionalId);
  const createMutation = useCreateCirugiaCatalogo(profesionalId);
  const updateMutation = useUpdateCirugiaCatalogo(profesionalId);
  const deleteMutation = useDeleteCirugiaCatalogo(profesionalId);
  const setInsumosMutation = useSetInsumosCirugia(profesionalId);
  const recalcularMutation = useRecalcularPrecioCirugia(profesionalId);

  const handleOpenModal = (cirugia?: CirugiaCatalogo) => {
    if (cirugia) {
      setEditingCirugia(cirugia);
      setFormData({
        nombre: cirugia.nombre,
        precioARS: cirugia.precioARS != null ? String(cirugia.precioARS) : '',
        precioUSD: cirugia.precioUSD != null ? String(cirugia.precioUSD) : '',
        duracionMinutos: cirugia.duracionMinutos != null ? String(cirugia.duracionMinutos) : '',
      });
      setInsumosLocal(
        (cirugia.insumos ?? []).map((i) => ({
          productoId: i.productoId,
          nombre: i.producto.nombre,
          cantidad: Number(i.cantidad),
          costoBase: i.producto.costoBase !== null ? Number(i.producto.costoBase) : null,
          unidadMedida: i.producto.unidadMedida ?? null,
        })),
      );
    } else {
      setEditingCirugia(null);
      setFormData(emptyFormData);
      setInsumosLocal([]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCirugia(null);
    setFormData(emptyFormData);
    setInsumosLocal([]);
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    const precioARS = formData.precioARS ? parseFloat(formData.precioARS) || undefined : undefined;
    const precioUSD = formData.precioUSD ? parseFloat(formData.precioUSD) || undefined : undefined;
    const duracionMinutos = formData.duracionMinutos
      ? parseInt(formData.duracionMinutos) || undefined
      : undefined;

    try {
      let savedId: string;

      if (editingCirugia) {
        const updated = await updateMutation.mutateAsync({
          id: editingCirugia.id,
          dto: {
            nombre: formData.nombre.trim(),
            precioARS,
            precioUSD,
            duracionMinutos,
          },
        });
        savedId = updated.id;
        toast.success('Cirugía actualizada');
      } else {
        const created = await createMutation.mutateAsync({
          nombre: formData.nombre.trim(),
          precioARS,
          precioUSD,
          duracionMinutos,
        });
        savedId = created.id;
        toast.success('Cirugía creada');
      }

      if (insumosLocal.length > 0 || editingCirugia) {
        await setInsumosMutation.mutateAsync({
          id: savedId,
          dto: {
            insumos: insumosLocal.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
          },
        });
      }

      handleCloseModal();
    } catch {
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async () => {
    if (!editingCirugia) return;

    try {
      await deleteMutation.mutateAsync(editingCirugia.id);
      toast.success('Cirugía eliminada');
      setIsDeleteDialogOpen(false);
      setEditingCirugia(null);
    } catch {
      toast.error('Error al eliminar');
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-red-500">Error al cargar cirugías</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Cirugías</CardTitle>
            <CardDescription>
              Gestioná las cirugías disponibles con sus precios e insumos asociados.
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cirugía
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !cirugias || cirugias.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay cirugías configuradas. Creá una para empezar.
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Precio ARS</TableHead>
                  <TableHead className="text-right">Precio USD</TableHead>
                  <TableHead className="text-center">Duración</TableHead>
                  <TableHead className="text-right">Costo insumos</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cirugias.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell className="text-right">
                      {c.precioARS != null
                        ? '$' + Number(c.precioARS).toLocaleString('es-AR', { minimumFractionDigits: 2 })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.precioUSD != null
                        ? 'USD ' + Number(c.precioUSD).toLocaleString('en-US', { minimumFractionDigits: 2 })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      {c.duracionMinutos != null ? `${c.duracionMinutos} min` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.precioBase != null
                        ? '$' + Number(c.precioBase).toLocaleString('es-AR', { minimumFractionDigits: 2 })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(c)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCirugia(c);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Create/Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCirugia ? 'Editar Cirugía' : 'Nueva Cirugía'}
              </DialogTitle>
              <DialogDescription>
                {editingCirugia
                  ? 'Modificá los datos de la cirugía.'
                  : 'Completá los datos para crear una nueva cirugía.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Rinoplastia primaria"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precioARS">Precio ARS</Label>
                  <Input
                    id="precioARS"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precioARS}
                    onChange={(e) => setFormData({ ...formData, precioARS: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precioUSD">Precio USD</Label>
                  <Input
                    id="precioUSD"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precioUSD}
                    onChange={(e) => setFormData({ ...formData, precioUSD: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duracion">Duración estimada (min)</Label>
                <Input
                  id="duracion"
                  type="number"
                  min="1"
                  value={formData.duracionMinutos}
                  onChange={(e) => setFormData({ ...formData, duracionMinutos: e.target.value })}
                  placeholder="60"
                />
              </div>

              <div className="space-y-2">
                <Label>Insumos</Label>
                <InsumosEditor
                  profesionalId={profesionalId}
                  initialInsumos={insumosLocal}
                  onChange={setInsumosLocal}
                />
              </div>

              {insumosLocal.some((i) => i.costoBase === null) && (
                <p className="text-xs text-amber-600">
                  Algunos insumos no tienen costo base configurado. Se usará $0 para esos ítems al recalcular.
                </p>
              )}

              {editingCirugia && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={recalcularMutation.isPending || insumosLocal.length === 0}
                  onClick={async () => {
                    if (!editingCirugia) return;
                    try {
                      await recalcularMutation.mutateAsync(editingCirugia.id);
                      toast.success('Precio recalculado');
                    } catch {
                      toast.error('Error al recalcular');
                    }
                  }}
                >
                  {recalcularMutation.isPending ? 'Calculando...' : 'Recalcular desde insumos'}
                </Button>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending || setInsumosMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending || setInsumosMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingCirugia ? 'Guardar cambios' : 'Crear cirugía'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar cirugía?</AlertDialogTitle>
              <AlertDialogDescription>
                La cirugía &quot;{editingCirugia?.nombre}&quot; será marcada como inactiva y no
                aparecerá en la lista. Podés crearla nuevamente si lo necesitás.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEditingCirugia(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

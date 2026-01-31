'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, RotateCcw, Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  useTratamientosProfesional,
  useCreateTratamiento,
  useUpdateTratamiento,
  useDeleteTratamiento,
  useRestoreTratamiento,
} from '@/hooks/useTratamientosProfesional';
import type { Tratamiento, CreateTratamientoDto } from '@/types/tratamiento';

interface TratamientoFormData {
  nombre: string;
  descripcion: string;
  precio: string;
  indicaciones: string;
  procedimiento: string;
  duracionMinutos: string;
}

const emptyFormData: TratamientoFormData = {
  nombre: '',
  descripcion: '',
  precio: '',
  indicaciones: '',
  procedimiento: '',
  duracionMinutos: '',
};

export default function GestionTratamientos() {
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTratamiento, setSelectedTratamiento] = useState<Tratamiento | null>(null);
  const [formData, setFormData] = useState<TratamientoFormData>(emptyFormData);

  const { data: tratamientos, isLoading, error } = useTratamientosProfesional(showInactive);
  const createMutation = useCreateTratamiento();
  const updateMutation = useUpdateTratamiento();
  const deleteMutation = useDeleteTratamiento();
  const restoreMutation = useRestoreTratamiento();

  const handleOpenModal = (tratamiento?: Tratamiento) => {
    if (tratamiento) {
      setSelectedTratamiento(tratamiento);
      setFormData({
        nombre: tratamiento.nombre,
        descripcion: tratamiento.descripcion || '',
        precio: String(tratamiento.precio),
        indicaciones: tratamiento.indicaciones || '',
        procedimiento: tratamiento.procedimiento || '',
        duracionMinutos: tratamiento.duracionMinutos ? String(tratamiento.duracionMinutos) : '',
      });
    } else {
      setSelectedTratamiento(null);
      setFormData(emptyFormData);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTratamiento(null);
    setFormData(emptyFormData);
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    const dto: CreateTratamientoDto = {
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim() || undefined,
      precio: formData.precio ? parseFloat(formData.precio) : undefined,
      indicaciones: formData.indicaciones.trim() || undefined,
      procedimiento: formData.procedimiento.trim() || undefined,
      duracionMinutos: formData.duracionMinutos ? parseInt(formData.duracionMinutos) : undefined,
    };

    try {
      if (selectedTratamiento) {
        await updateMutation.mutateAsync({ id: selectedTratamiento.id, dto });
        toast.success('Tratamiento actualizado');
      } else {
        await createMutation.mutateAsync(dto);
        toast.success('Tratamiento creado');
      }
      handleCloseModal();
    } catch {
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async () => {
    if (!selectedTratamiento) return;

    try {
      await deleteMutation.mutateAsync(selectedTratamiento.id);
      toast.success('Tratamiento eliminado');
      setIsDeleteDialogOpen(false);
      setSelectedTratamiento(null);
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreMutation.mutateAsync(id);
      toast.success('Tratamiento restaurado');
    } catch {
      toast.error('Error al restaurar');
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-red-500">Error al cargar tratamientos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Tratamientos</CardTitle>
            <CardDescription>
              Gestioná los tratamientos disponibles para tus plantillas de historia clínica.
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Tratamiento
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="showInactive"
            checked={showInactive}
            onCheckedChange={(checked) => setShowInactive(checked === true)}
          />
          <Label htmlFor="showInactive" className="font-normal">
            Mostrar tratamientos inactivos
          </Label>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tratamientos?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay tratamientos configurados. Creá uno para empezar.
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-center">Duración</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tratamientos?.map((t) => (
                  <TableRow key={t.id} className={!t.activo ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{t.nombre}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {t.descripcion || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(t.precio)}
                    </TableCell>
                    <TableCell className="text-center">
                      {t.duracionMinutos ? `${t.duracionMinutos} min` : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          t.activo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {t.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(t)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {t.activo ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTratamiento(t);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(t.id)}
                          >
                            <RotateCcw className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedTratamiento ? 'Editar Tratamiento' : 'Nuevo Tratamiento'}
              </DialogTitle>
              <DialogDescription>
                {selectedTratamiento
                  ? 'Modificá los datos del tratamiento.'
                  : 'Completá los datos para crear un nuevo tratamiento.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Ej: Botox zona entrecejo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  placeholder="Breve descripción del tratamiento"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precio">Precio</Label>
                  <Input
                    id="precio"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precio}
                    onChange={(e) =>
                      setFormData({ ...formData, precio: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duracion">Duración (minutos)</Label>
                  <Input
                    id="duracion"
                    type="number"
                    min="1"
                    value={formData.duracionMinutos}
                    onChange={(e) =>
                      setFormData({ ...formData, duracionMinutos: e.target.value })
                    }
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="indicaciones">Indicaciones</Label>
                <Textarea
                  id="indicaciones"
                  value={formData.indicaciones}
                  onChange={(e) =>
                    setFormData({ ...formData, indicaciones: e.target.value })
                  }
                  placeholder="Indicaciones pre y post tratamiento para el paciente..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="procedimiento">Procedimiento</Label>
                <Textarea
                  id="procedimiento"
                  value={formData.procedimiento}
                  onChange={(e) =>
                    setFormData({ ...formData, procedimiento: e.target.value })
                  }
                  placeholder="Descripción del procedimiento a realizar..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {selectedTratamiento ? 'Guardar cambios' : 'Crear tratamiento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar tratamiento?</AlertDialogTitle>
              <AlertDialogDescription>
                El tratamiento &quot;{selectedTratamiento?.nombre}&quot; será marcado como
                inactivo y no aparecerá en las plantillas. Podés restaurarlo más adelante.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
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

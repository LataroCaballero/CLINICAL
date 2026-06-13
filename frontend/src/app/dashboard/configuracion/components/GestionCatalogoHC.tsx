'use client';

import { useState } from 'react';
import { Pencil, Trash2, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useCatalogoHC } from '@/hooks/useCatalogoHC';
import {
  useRenombrarZona,
  useEliminarZona,
  useRenombrarDiagnostico,
  useEliminarDiagnostico,
  useRenombrarTratamiento,
  useEliminarTratamiento,
} from '@/hooks/useCatalogoHCMutations';

type RenameTarget =
  | { tipo: 'zona'; id: string; nombreActual: string }
  | { tipo: 'diagnostico'; id: string; nombreActual: string }
  | { tipo: 'tratamiento'; id: string; nombreActual: string };

type DeleteTarget =
  | { tipo: 'zona'; id: string; nombre: string }
  | { tipo: 'diagnostico'; id: string; nombre: string }
  | { tipo: 'tratamiento'; id: string; nombre: string };

export default function GestionCatalogoHC({ profesionalId }: { profesionalId?: string }) {
  const [expandedZonas, setExpandedZonas] = useState<Set<string>>(new Set());
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameNombre, setRenameNombre] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const { data: zonas, isLoading, error } = useCatalogoHC(
    profesionalId,
    { enabled: profesionalId !== undefined ? !!profesionalId : true },
  );

  const renombrarZona = useRenombrarZona(profesionalId);
  const eliminarZona = useEliminarZona(profesionalId);
  const renombrarDiagnostico = useRenombrarDiagnostico(profesionalId);
  const eliminarDiagnostico = useEliminarDiagnostico(profesionalId);
  const renombrarTratamiento = useRenombrarTratamiento(profesionalId);
  const eliminarTratamiento = useEliminarTratamiento(profesionalId);

  const toggleZona = (id: string) => {
    setExpandedZonas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openRename = (target: RenameTarget) => {
    setRenameTarget(target);
    setRenameNombre(target.nombreActual);
  };

  const closeRename = () => {
    setRenameTarget(null);
    setRenameNombre('');
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    if (renameNombre.trim().length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres');
      return;
    }
    try {
      if (renameTarget.tipo === 'zona') {
        await renombrarZona.mutateAsync({ id: renameTarget.id, nombre: renameNombre.trim() });
      } else if (renameTarget.tipo === 'diagnostico') {
        await renombrarDiagnostico.mutateAsync({ id: renameTarget.id, nombre: renameNombre.trim() });
      } else {
        await renombrarTratamiento.mutateAsync({ id: renameTarget.id, nombre: renameNombre.trim() });
      }
      toast.success('Nombre actualizado');
      closeRename();
    } catch {
      toast.error('Error al renombrar');
    }
  };

  const openDelete = (target: DeleteTarget) => {
    setDeleteTarget(target);
  };

  const closeDelete = () => {
    setDeleteTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.tipo === 'zona') {
        await eliminarZona.mutateAsync(deleteTarget.id);
      } else if (deleteTarget.tipo === 'diagnostico') {
        await eliminarDiagnostico.mutateAsync(deleteTarget.id);
      } else {
        await eliminarTratamiento.mutateAsync(deleteTarget.id);
      }
      toast.success('Ítem eliminado');
      closeDelete();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const isRenamePending =
    renombrarZona.isPending ||
    renombrarDiagnostico.isPending ||
    renombrarTratamiento.isPending;

  const isDeletePending =
    eliminarZona.isPending ||
    eliminarDiagnostico.isPending ||
    eliminarTratamiento.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catálogo HC</CardTitle>
        <CardDescription>
          Gestioná las zonas, diagnósticos y tratamientos que aparecen en el formulario de Primera Consulta.
          Los cambios se reflejan de inmediato.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <p className="text-center text-red-500 py-4">Error al cargar el catálogo</p>
        )}

        {!isLoading && !error && (!zonas || zonas.length === 0) && (
          <p className="text-center text-muted-foreground py-4">No hay zonas configuradas</p>
        )}

        {!isLoading && !error && zonas && zonas.length > 0 && (
          <div className="space-y-1">
            {zonas.map((zona) => {
              const isExpanded = expandedZonas.has(zona.id);
              return (
                <div key={zona.id} className="border rounded-lg overflow-hidden">
                  {/* Zona row */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors">
                    <button
                      onClick={() => toggleZona(zona.id)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="font-medium text-sm">{zona.nombre}</span>
                    </button>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {zona.esSistema ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                          Sistema
                        </span>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openRename({ tipo: 'zona', id: zona.id, nombreActual: zona.nombre })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openDelete({ tipo: 'zona', id: zona.id, nombre: zona.nombre })}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 py-2 space-y-3 bg-background border-t">
                      {/* Diagnosticos */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Diagnósticos
                        </p>
                        {zona.diagnosticos.length === 0 ? (
                          <p className="text-xs text-muted-foreground pl-2">Sin diagnósticos</p>
                        ) : (
                          <div className="space-y-0.5">
                            {zona.diagnosticos.map((dx) => (
                              <div key={dx.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/30">
                                <span className="text-sm flex-1">{dx.nombre}</span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {dx.esSistema ? (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                                      Sistema
                                    </span>
                                  ) : (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => openRename({ tipo: 'diagnostico', id: dx.id, nombreActual: dx.nombre })}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => openDelete({ tipo: 'diagnostico', id: dx.id, nombre: dx.nombre })}
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Tratamientos */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Tratamientos
                        </p>
                        {zona.tratamientos.length === 0 ? (
                          <p className="text-xs text-muted-foreground pl-2">Sin tratamientos</p>
                        ) : (
                          <div className="space-y-0.5">
                            {zona.tratamientos.map((tx) => (
                              <div key={tx.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/30">
                                <span className="text-sm flex-1">{tx.nombre}</span>
                                {tx.precio !== null && (
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    ${Number(tx.precio).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                                  </span>
                                )}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {tx.esSistema ? (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                                      Sistema
                                    </span>
                                  ) : (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => openRename({ tipo: 'tratamiento', id: tx.id, nombreActual: tx.nombre })}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => openDelete({ tipo: 'tratamiento', id: tx.id, nombre: tx.nombre })}
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Rename Dialog */}
        <Dialog open={renameTarget !== null} onOpenChange={(open) => { if (!open) closeRename(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Renombrar</DialogTitle>
              <DialogDescription>
                Ingresá el nuevo nombre para este ítem. El cambio se reflejará en el formulario
                de Primera Consulta.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="rename-input">Nombre</Label>
              <Input
                id="rename-input"
                value={renameNombre}
                onChange={(e) => setRenameNombre(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeRename}>
                Cancelar
              </Button>
              <Button onClick={handleRename} disabled={isRenamePending}>
                {isRenamePending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete AlertDialog */}
        <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) closeDelete(); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar &quot;{deleteTarget?.nombre}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                El ítem dejará de aparecer en el formulario Primera Consulta. Las historias clínicas
                ya registradas no se modifican.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletePending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

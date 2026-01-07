'use client';

import { useState } from 'react';
import { Plus, FileText, Archive, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useHCTemplates,
  useCreateHCTemplate,
  useArchiveHCTemplate,
} from '@/hooks/useHCTemplates';
import type { HCTemplateWithVersions } from '@/types/hc-templates';

interface TemplateListProps {
  onSelectTemplate: (template: HCTemplateWithVersions) => void;
}

export function TemplateList({ onSelectTemplate }: TemplateListProps) {
  const { data: templates, isLoading } = useHCTemplates();
  const createMutation = useCreateHCTemplate();
  const archiveMutation = useArchiveHCTemplate();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;

    await createMutation.mutateAsync({
      nombre: newName.trim(),
      descripcion: newDescription.trim() || undefined,
    });

    setNewName('');
    setNewDescription('');
    setIsCreateDialogOpen(false);
  };

  const handleArchive = async (id: string) => {
    await archiveMutation.mutateAsync(id);
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'PUBLISHED':
        return <Badge variant="default">Publicada</Badge>;
      case 'DRAFT':
        return <Badge variant="secondary">Borrador</Badge>;
      case 'ARCHIVED':
        return <Badge variant="outline">Archivada</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const activeTemplates = templates?.filter((t) => t.estado !== 'ARCHIVED') || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Plantillas de Historia Clínica</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      {activeTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No tenés plantillas creadas todavía.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Crear tu primera plantilla
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {activeTemplates.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => onSelectTemplate(template)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{template.nombre}</CardTitle>
                    {template.descripcion && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.descripcion}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getEstadoBadge(template.estado)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchive(template.id);
                          }}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archivar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>
                    {template._count?.versions || 0} versión
                    {(template._count?.versions || 0) !== 1 ? 'es' : ''}
                  </span>
                  {template.currentVersion && (
                    <span>v{template.currentVersion.version} publicada</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Plantilla</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Primera Consulta"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción (opcional)</Label>
              <Textarea
                id="descripcion"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Describe brevemente el propósito de esta plantilla"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

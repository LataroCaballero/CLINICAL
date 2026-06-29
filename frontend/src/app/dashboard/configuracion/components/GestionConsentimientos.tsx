'use client';

import { useState, useRef } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useConsentimientos } from '@/hooks/useConsentimientos';
import {
  useUploadConsentimiento,
  useUpdateIndicaciones,
} from '@/hooks/useConsentimientosMutations';

export default function GestionConsentimientos({ profesionalId }: { profesionalId?: string }) {
  const { data: zonas, isLoading, error } = useConsentimientos(
    profesionalId,
    { enabled: profesionalId !== undefined ? !!profesionalId : true },
  );

  const uploadConsentimiento = useUploadConsentimiento(profesionalId);
  const updateIndicaciones = useUpdateIndicaciones(profesionalId);

  // Stores only the user's in-session edits. Display value for each zona is:
  //   indicacionesUrls[zona.id] ?? zona.indicacionesUrl ?? ''
  // so we never need to initialize from server data — the fallback to zona.indicacionesUrl
  // handles the pre-fill naturally without any effect or render-phase side effects.
  const [indicacionesUrls, setIndicacionesUrls] = useState<Record<string, string>>({});
  // File inputs per zona (keyed by zona.id)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleSaveIndicaciones = async (zonaId: string, currentServerUrl: string | null) => {
    // Use the user's edited value if available; otherwise fall back to the server value
    const url = zonaId in indicacionesUrls
      ? indicacionesUrls[zonaId]
      : (currentServerUrl ?? '');
    try {
      await updateIndicaciones.mutateAsync({
        zonaId,
        indicacionesUrl: url.trim() === '' ? null : url.trim(),
      });
      toast.success('URL de indicaciones guardada');
    } catch {
      toast.error('Error al guardar la URL de indicaciones');
    }
  };

  const handleUploadConsentimiento = async (zonaId: string) => {
    const fileInput = fileInputRefs.current[zonaId];
    if (!fileInput?.files?.[0]) {
      toast.error('Seleccioná un archivo PDF primero');
      return;
    }
    const file = fileInput.files[0];
    try {
      await uploadConsentimiento.mutateAsync({ zonaId, file });
      toast.success('Consentimiento subido correctamente');
      // Reset the file input
      fileInput.value = '';
    } catch {
      toast.error('Error al subir el consentimiento. Verificá que sea un archivo PDF válido.');
    }
  };

  const formatUploadDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consentimientos</CardTitle>
        <CardDescription>
          Gestioná el PDF de consentimiento informado y el link de indicaciones para cada zona
          quirúrgica. El consentimiento vigente se muestra a los pacientes en su portal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <p className="text-center text-red-500 py-4">Error al cargar las zonas</p>
        )}

        {!isLoading && !error && (!zonas || zonas.length === 0) && (
          <p className="text-center text-muted-foreground py-4">No hay zonas configuradas</p>
        )}

        {!isLoading && !error && zonas && zonas.length > 0 && (
          <div className="space-y-4">
            {zonas.map((zona) => {
              const isUploading =
                uploadConsentimiento.isPending &&
                uploadConsentimiento.variables?.zonaId === zona.id;
              const isSavingIndicaciones =
                updateIndicaciones.isPending &&
                updateIndicaciones.variables?.zonaId === zona.id;

              return (
                <div key={zona.id} className="border rounded-lg p-4 space-y-4">
                  {/* Zona title */}
                  <h3 className="font-semibold text-sm capitalize">{zona.nombre}</h3>

                  {/* Indicaciones URL row */}
                  <div className="space-y-2">
                    <Label htmlFor={`indicaciones-${zona.id}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Link de indicaciones
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={`indicaciones-${zona.id}`}
                        type="url"
                        placeholder="https://..."
                        value={
                          zona.id in indicacionesUrls
                            ? indicacionesUrls[zona.id]
                            : (zona.indicacionesUrl ?? '')
                        }
                        onChange={(e) =>
                          setIndicacionesUrls((prev) => ({
                            ...prev,
                            [zona.id]: e.target.value,
                          }))
                        }
                        className="flex-1 text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveIndicaciones(zona.id, zona.indicacionesUrl)}
                        disabled={isSavingIndicaciones}
                      >
                        {isSavingIndicaciones && (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        )}
                        Guardar
                      </Button>
                    </div>
                  </div>

                  {/* Consent PDF row */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Consentimiento informado (PDF)
                    </Label>

                    {/* Current vigente consent */}
                    <div className="text-sm">
                      {zona.consentimientoVigente ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-foreground font-medium">
                            {zona.consentimientoVigente.nombreOriginal}
                          </span>
                          <span className="text-xs">
                            — subido el {formatUploadDate(zona.consentimientoVigente.uploadedAt)}
                          </span>
                          {zona.consentimientoVigente.url && (
                            <a
                              href={zona.consentimientoVigente.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline ml-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Ver PDF
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-xs italic">
                          Sin consentimiento cargado
                        </p>
                      )}
                    </div>

                    {/* Upload row */}
                    <div className="flex gap-2 items-center">
                      <input
                        ref={(el) => { fileInputRefs.current[zona.id] = el; }}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="text-sm text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUploadConsentimiento(zona.id)}
                        disabled={isUploading}
                      >
                        {isUploading && (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        )}
                        Subir PDF
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

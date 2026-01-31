'use client';

import { useState } from 'react';
import { DollarSign, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLiveTurnoStore } from '@/store/live-turno.store';
import { useCobrarTurno } from '@/hooks/useCobrarTurno';
import { toast } from 'sonner';

export function CobrarConsultaTab() {
  const { session, draftData, setDraftData } = useLiveTurnoStore();
  const cobrarTurno = useCobrarTurno();

  const pagoData = draftData.pagoData || {};

  if (!session) return null;

  const updateDraft = (field: string, value: string | number | boolean) => {
    setDraftData('pagoData', {
      ...pagoData,
      [field]: value,
    });
  };

  const handleCobrar = async () => {
    if (!pagoData.monto || pagoData.monto <= 0) {
      toast.error('Ingresa un monto valido');
      return;
    }

    try {
      await cobrarTurno.mutateAsync({
        turnoId: session.turnoId,
        pacienteId: session.pacienteId,
        data: {
          monto: pagoData.monto,
          descripcion: pagoData.descripcion || `Consulta - ${session.tipoTurno}`,
        },
      });
      toast.success('Cobro registrado correctamente');
      updateDraft('completed', true);
    } catch (error) {
      toast.error('Error al registrar el cobro');
    }
  };

  if (pagoData.completed) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Cobro registrado</h3>
            <p className="text-gray-500 mb-4">
              Se registro un cobro de ${pagoData.monto?.toLocaleString('es-AR')} para esta consulta.
            </p>
            <Button
              variant="outline"
              onClick={() => setDraftData('pagoData', {})}
            >
              Registrar otro cobro
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Cobrar Consulta
          </CardTitle>
          <CardDescription>
            Registrar el pago de la consulta de {session.pacienteNombre}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Monto</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                $
              </span>
              <Input
                type="number"
                placeholder="0.00"
                className="pl-8"
                value={pagoData.monto || ''}
                onChange={(e) =>
                  updateDraft('monto', parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descripcion (opcional)</label>
            <Textarea
              placeholder={`Consulta - ${session.tipoTurno}`}
              value={pagoData.descripcion || ''}
              onChange={(e) => updateDraft('descripcion', e.target.value)}
              rows={2}
            />
          </div>

          <Button
            onClick={handleCobrar}
            disabled={!pagoData.monto || pagoData.monto <= 0 || cobrarTurno.isPending}
            className="w-full"
          >
            {cobrarTurno.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <DollarSign className="w-4 h-4 mr-2" />
            )}
            Registrar cobro
          </Button>
        </CardContent>
      </Card>

      {/* Quick Info */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Tipo de consulta</span>
            <span className="font-medium">{session.tipoTurno}</span>
          </div>
          {session.pacienteObraSocial && (
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-500">Obra social</span>
              <span className="font-medium">
                {session.pacienteObraSocial}
                {session.pacientePlan && ` - ${session.pacientePlan}`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

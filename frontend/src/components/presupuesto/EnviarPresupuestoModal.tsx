"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEnviarPresupuesto } from "@/hooks/useEnviarPresupuesto";
import { Download, Mail, MessageCircle } from "lucide-react";
import { api } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  presupuestoId: string;
  pacienteId: string;
  pacienteEmail?: string;
};

export default function EnviarPresupuestoModal({
  open,
  onClose,
  presupuestoId,
  pacienteId,
  pacienteEmail = "",
}: Props) {
  const [emailDestino, setEmailDestino] = useState(pacienteEmail);
  const [nota, setNota] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const enviarPresupuesto = useEnviarPresupuesto();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await api.get(`/presupuestos/${presupuestoId}/pdf`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `presupuesto-${presupuestoId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEnviarEmail = async () => {
    if (!emailDestino.trim()) return;
    await enviarPresupuesto.mutateAsync({
      presupuestoId,
      pacienteId,
      emailDestino: emailDestino.trim(),
      notaCoordinador: nota.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Presupuesto</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Download */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            <Download className="w-4 h-4" />
            {isDownloading ? "Descargando..." : "Descargar PDF"}
          </Button>

          {/* Email */}
          {!showEmailForm ? (
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => setShowEmailForm(true)}
            >
              <Mail className="w-4 h-4" />
              Enviar por Email
            </Button>
          ) : (
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" /> Enviar por Email
              </p>
              <div className="space-y-1">
                <Label htmlFor="email-destino">Email del paciente</Label>
                <Input
                  id="email-destino"
                  type="email"
                  value={emailDestino}
                  onChange={(e) => setEmailDestino(e.target.value)}
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nota">Nota adicional (opcional)</Label>
                <Textarea
                  id="nota"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Mensaje adicional para el paciente..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmailForm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleEnviarEmail}
                  disabled={!emailDestino.trim() || enviarPresupuesto.isPending}
                >
                  {enviarPresupuesto.isPending ? "Enviando..." : "Enviar Email"}
                </Button>
              </div>
            </div>
          )}

          {/* WhatsApp - Placeholder, Phase 4 */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3 opacity-50 cursor-not-allowed"
            disabled
            title="Disponible en Phase 4 — Integración WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
            Enviar por WhatsApp
            <span className="ml-auto text-xs text-muted-foreground">Próximamente</span>
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

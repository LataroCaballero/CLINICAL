"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { portalConsultaSchema } from "@/schemas/portalConsulta.schema";
import { useEnviarConsulta } from "@/hooks/usePortalDatos";

const CONSULTAS_SUGERIDAS = [
  "Tengo una duda sobre la fecha de mi cirugia",
  "Que tengo que llevar el dia de la operacion?",
  "Puedo tomar mi medicacion habitual antes de la cirugia?",
  "Cuanto tiempo de recuperacion voy a necesitar?",
  "Necesito hacer algun estudio previo?",
];

/**
 * Seccion "Consultas" del portal del paciente (CHAT-04).
 * One-way (D-02): el paciente envia consultas al medico; NO ve respuestas del staff.
 * Opcional y reutilizable (D-11): puede enviar varias consultas en distintas visitas.
 */
export function PortalConsultas() {
  const [mensaje, setMensaje] = useState("");
  const [enviado, setEnviado] = useState(false);
  const enviarConsulta = useEnviarConsulta();

  const handleSugerencia = (sugerencia: string) => {
    setMensaje(sugerencia);
  };

  const handleSubmit = async () => {
    const result = portalConsultaSchema.safeParse({ mensaje });
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "La consulta no es valida");
      return;
    }
    try {
      await enviarConsulta.mutateAsync(mensaje);
      setEnviado(true);
      setMensaje("");
      toast.success("Consulta enviada al equipo medico");
    } catch {
      toast.error("No pudimos enviar, proba de nuevo");
    }
  };

  return (
    <div className="space-y-4 text-base">
      {/* Banner de confirmacion — persiste para que el paciente sepa que fue enviado (D-11) */}
      {enviado && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <CheckCircle className="w-5 h-5 text-green-600 inline mr-2" />
          <span className="text-green-800 font-medium">
            Enviamos tu consulta al equipo medico
          </span>
        </div>
      )}

      <p className="text-gray-700">
        Elegí una consulta frecuente o escribí la tuya, y te respondemos a la brevedad.
      </p>

      {/* Chips de sugerencias comunes */}
      <div className="space-y-2">
        {CONSULTAS_SUGERIDAS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => handleSugerencia(s)}
            className="w-full text-left text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Textarea libre */}
      <Textarea
        placeholder="O escribí tu consulta acá..."
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        rows={4}
        className="text-base"
      />
      <p className="text-xs text-gray-400 text-right">{mensaje.length}/2000</p>

      {/* Boton de envio — deshabilitado si no hay texto */}
      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={enviarConsulta.isPending || !mensaje.trim()}
      >
        {enviarConsulta.isPending && (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        )}
        Enviar consulta
      </Button>
    </div>
  );
}

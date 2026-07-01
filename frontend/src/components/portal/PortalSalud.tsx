"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SaludChips } from "./SaludChips";
import { useUpdateSalud } from "@/hooks/usePortalDatos";
import type { PortalDatos } from "@/types/portal";

interface Props {
  salud: PortalDatos["saludAutoReportada"];
}

// Sugerencias comunes por categoria (D-04)
const SUGERENCIAS_ALERGIAS = [
  "Penicilina",
  "Iodo",
  "Latex",
  "AINEs",
  "Anestesia local",
  "Polen",
  "Gluten",
  "Lactosa",
];

const SUGERENCIAS_MEDICACION = [
  "Anticoagulantes",
  "Antihipertensivos",
  "Insulina",
  "Corticoides",
  "Ansiolíticos",
  "Antidepresivos",
  "Anticonvulsivantes",
  "Estatinas",
];

const SUGERENCIAS_CONDICIONES = [
  "Hipertensión",
  "Diabetes",
  "Asma",
  "Enfermedad cardíaca",
  "Hipotiroidismo",
  "Obesidad",
  "Artritis",
  "Epilepsia",
  "Alergia severa",
  "Cannabis",
];

/**
 * Seccion "Salud" del portal del paciente.
 * 4 categorias pre-cargadas desde valores staged (D-05):
 *   - Alergias -> alergiasAutoReportadas (string[])
 *   - Medicacion -> medicacionAutoReportada (string[])
 *   - Condiciones/enfermedades -> antecedentesAutoReportados (object: { [condicion]: true })
 *   - Tratamientos previos -> tratamientosPreviosAutoReportados (string)
 *
 * Guardado SOLO a campos *AutoReportad* via PATCH /salud (D-06, T-55-10).
 * NUNCA envia campos clinicos curados (alergias/condiciones/medicacion sin sufijo).
 */
export function PortalSalud({ salud }: Props) {
  const updateSalud = useUpdateSalud();

  // Extraer condiciones como array desde el objeto antecedentesAutoReportados
  // Shape elegido: { [condicion]: true } — keys son los nombres de condicion
  const condicionesInicial: string[] = salud.antecedentesAutoReportados
    ? Object.keys(salud.antecedentesAutoReportados)
    : [];

  const [alergias, setAlergias] = useState<string[]>(
    salud.alergiasAutoReportadas ?? []
  );
  const [medicacion, setMedicacion] = useState<string[]>(
    salud.medicacionAutoReportada ?? []
  );
  const [condiciones, setCondiciones] = useState<string[]>(condicionesInicial);
  const [tratamientos, setTratamientos] = useState<string>(
    salud.tratamientosPreviosAutoReportados ?? ""
  );

  const handleGuardar = async () => {
    // Payload confinado a los 4 campos *AutoReportad* — NUNCA clinicos curados (D-06)
    try {
      await updateSalud.mutateAsync({
        alergiasAutoReportadas: alergias,
        medicacionAutoReportada: medicacion,
        antecedentesAutoReportados: Object.fromEntries(
          condiciones.map((c) => [c, true])
        ),
        tratamientosPreviosAutoReportados: tratamientos,
      });
      toast.success("Guardamos tu informacion de salud");
    } catch {
      toast.error("No pudimos guardar, proba de nuevo");
    }
  };

  return (
    <div className="space-y-6 text-base">
      {/* Alergias */}
      <SaludChips
        label="Alergias"
        sugerencias={SUGERENCIAS_ALERGIAS}
        value={alergias}
        onChange={setAlergias}
      />

      {/* Medicacion */}
      <SaludChips
        label="Medicacion"
        sugerencias={SUGERENCIAS_MEDICACION}
        value={medicacion}
        onChange={setMedicacion}
      />

      {/* Condiciones y enfermedades */}
      <SaludChips
        label="Condiciones y enfermedades"
        sugerencias={SUGERENCIAS_CONDICIONES}
        value={condiciones}
        onChange={setCondiciones}
      />

      {/* Tratamientos previos — campo de texto libre (STRING en el DTO) */}
      <div className="space-y-2">
        <Label htmlFor="tratamientos" className="font-semibold text-base">
          Tratamientos y operaciones previas
        </Label>
        <Textarea
          id="tratamientos"
          placeholder="Contanos sobre operaciones o tratamientos que hayas tenido antes"
          value={tratamientos}
          onChange={(e) => setTratamientos(e.target.value)}
          rows={4}
        />
      </div>

      <Button
        type="button"
        className="w-full"
        onClick={handleGuardar}
        disabled={updateSalud.isPending}
      >
        {updateSalud.isPending ? "Guardando..." : "Guardar"}
      </Button>
    </div>
  );
}

import Image from "next/image";
import {
  AlertTriangle,
  Check,
  XCircle,
  Mail,
  IdCard,
  Calendar,
  Stethoscope,
  FileText,
  MapPin,
  Phone,
  UserCircle2,
  ClipboardList,
  CalendarDays,
  MessageSquare,
  Wallet,
  Receipt,
} from "lucide-react";
import { MedicalChips } from "@/components/ui/MedicalChips";
import { getPatientAlerts } from "./columns";

export default function PacienteDetails({ paciente, onAction }: { paciente: any; onAction?: (view: "default" | "datos" | "historia" | "turnos" | "mensajes" | "cuenta" | "presupuestos") => void }) {
  if (!paciente) return null;

  const calcularEdad = (fechaNac?: string) => {
    if (!fechaNac) return "-";
    const diff = Date.now() - new Date(fechaNac).getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };

  const edad = calcularEdad(paciente.fechaNacimiento);
  const obraSocialNombre = paciente.obraSocial?.nombre ?? "Sin obra social";
  const alertas = getPatientAlerts(paciente);

  return (
    <div className="space-y-6 px-2 pb-6 max-w-3xl mx-auto">
      {/* =======================
          ALERTAS
      ======================== */}
      {alertas.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">
              {alertas.length === 1 ? "Alerta pendiente" : "Alertas pendientes"}
            </span>
          </div>
          <ul className="space-y-1 pl-6">
            {alertas.map((alerta) => (
              <li key={alerta} className="text-sm text-red-600 list-disc">
                {alerta}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* =======================
          HEADER
      ======================== */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* BLOQUE IZQUIERDO */}
        <div className="flex items-start gap-4">
          {/* Foto */}
          <div className={`w-20 h-20 rounded-full overflow-hidden border bg-gray-200 shrink-0 ${
            alertas.length > 0 ? "ring-3 ring-red-500 ring-offset-2" : ""
          }`}>
            {paciente.fotoUrl ? (
              <Image
                src={paciente.fotoUrl}
                alt={paciente.nombreCompleto}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-gray-500">
                {paciente.nombreCompleto?.charAt(0)}
              </div>
            )}
          </div>

          {/* Nombre + info básica */}
          <div className="flex flex-col justify-center">
            <h2 className="text-xl font-semibold leading-tight">{paciente.nombreCompleto}</h2>

            <p className="text-gray-600 flex items-center gap-2 mt-1">
              <IdCard className="w-4 h-4" /> DNI: {paciente.dni}
            </p>

            <p className="text-gray-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Edad: {edad} años
            </p>
          </div>
        </div>
        {/* BLOQUE DERECHO – ALERTAS MÉDICAS */}
        <div className="flex gap-4 flex-wrap sm:justify-end">
          <MedicalChips
            title="Alergias"
            items={paciente.alergias}
            variant="destructive"
          />

          <MedicalChips
            title="Condiciones"
            items={paciente.condiciones}
            variant="secondary"
          />
        </div>
      </div>

      {/* =======================
          GRID DE 2 COLUMNAS
      ======================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* DATOS DE CONTACTO */}
        <section>
          <h3 className="text-sm font-semibold mb-2">Datos de contacto</h3>
          <div className="space-y-1 text-gray-700 pl-2">
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4" /> {paciente.email || "Sin email"}
            </p>
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4" /> {paciente.telefono || "-"}
            </p>
          </div>
        </section>

        {/* OBRA SOCIAL */}
        <section>
          <h3 className="text-sm font-semibold mb-2">Obra social</h3>
          <div className="space-y-1 text-gray-700 pl-2">
            <p>• {obraSocialNombre}</p>
            {paciente.plan && <p>• Plan: {paciente.plan}</p>}
          </div>
        </section>

        {/* INFORMACIÓN MÉDICA */}
        <section>
          <h3 className="text-sm font-semibold mb-2">Información médica</h3>

          <div className="space-y-1 text-gray-700 pl-2">
            <p className="flex gap-2">
              <Stethoscope className="w-4 h-4 mt-1" />
              Diagnóstico: {paciente.diagnostico || "-"}
            </p>

            <p className="flex gap-2">
              <FileText className="w-4 h-4 mt-1" />
              Tratamiento: {paciente.tratamiento || "-"}
            </p>

            <p className="flex gap-2">
              <MapPin className="w-4 h-4 mt-1" />
              Lugar intervención: {paciente.lugarIntervencion || "-"}
            </p>
          </div>
        </section>

        {/* CONSENTIMIENTOS */}
        <section>
          <h3 className="text-sm font-semibold mb-2">Consentimientos</h3>

          <div className="space-y-1 text-gray-700 pl-2">
            <p className="flex items-center gap-2">
              {paciente.consentimientoFirmado ? (
                <Check className="text-green-600 w-4 h-4" />
              ) : (
                <XCircle className="text-red-600 w-4 h-4" />
              )}
              Consentimiento firmado
            </p>

            <p className="flex items-center gap-2">
              {paciente.indicacionesEnviadas ? (
                <>
                  <Check className="text-green-600 w-4 h-4" />
                  Indicaciones enviadas
                </>
              ) : (
                <>
                  <XCircle className="text-red-600 w-4 h-4" />
                  Indicaciones NO enviadas
                </>
              )}
            </p>

            <p className="flex items-center gap-2">
              Estado:{" "}
              <strong
                className={
                  paciente.estado === "ACTIVO"
                    ? "text-green-700"
                    : "text-gray-800"
                }
              >
                {paciente.estado || "-"}
              </strong>
            </p>
          </div>
        </section>
      </div>

      {/* =======================
          BOTONES DE ACCIÓN
      ======================== */}
      <div className="border-t pt-5">
        <h3 className="text-sm font-semibold mb-3">Acciones rápidas</h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <ActionButton
            icon={<UserCircle2 className="w-5 h-5" />}
            label="Datos completos"
            onClick={() => onAction?.("datos")}
          />
          <ActionButton
            icon={<ClipboardList className="w-5 h-5" />}
            label="Historia clínica"
            onClick={() => onAction?.("historia")}
          />
          <ActionButton
            icon={<Wallet className="w-5 h-5" />}
            label="Cuenta corriente"
            onClick={() => onAction?.("cuenta")}
          />
          <ActionButton
            icon={<Receipt className="w-5 h-5" />}
            label="Presupuestos"
            onClick={() => onAction?.("presupuestos")}
          />
          <ActionButton
            icon={<CalendarDays className="w-5 h-5" />}
            label="Turnos"
            onClick={() => onAction?.("turnos")}
          />
          <ActionButton
            icon={<MessageSquare className="w-5 h-5" />}
            label="Mensajes internos"
            onClick={() => onAction?.("mensajes")}
          />
        </div>
      </div>
    </div>
  );
}

// COMPONENTE REUTILIZABLE PARA LOS BOTONES
function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-3 border rounded-md hover:bg-muted transition text-sm min-h-[70px]"
    >
      <span className="mb-1">{icon}</span>
      {label}
    </button>
  );
}

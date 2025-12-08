import Image from "next/image";
import {
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
} from "lucide-react";

export default function PacienteDetails({ paciente, obraSocialNombre }: any) {
  if (!paciente) return null;

  const calcularEdad = (fechaNac?: string) => {
    if (!fechaNac) return "-";
    const diff = Date.now() - new Date(fechaNac).getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };

  const edad = calcularEdad(paciente.fechaNacimiento);

  return (
    <div className="space-y-8 px-2 pb-8">
      {/* =======================
          HEADER
      ======================== */}
      <div className="flex items-start gap-4">
        {/* Foto */}
        <div className="w-24 h-24 rounded-full overflow-hidden border bg-gray-200">
          {paciente.fotoUrl ? (
            <Image
              src={paciente.fotoUrl}
              alt={paciente.nombreCompleto}
              width={100}
              height={100}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl text-gray-500">
              {paciente.nombreCompleto?.charAt(0)}
            </div>
          )}
        </div>

        {/* Nombre + info básica */}
        <div className="flex flex-col justify-center">
          <h2 className="text-2xl font-semibold">{paciente.nombreCompleto}</h2>

          <p className="text-gray-600 flex items-center gap-2 mt-1">
            <IdCard className="w-4 h-4" /> DNI: {paciente.dni}
          </p>

          <p className="text-gray-600 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Edad: {edad} años
          </p>
        </div>
      </div>

      {/* =======================
          GRID DE 2 COLUMNAS
      ======================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DATOS DE CONTACTO */}
        <section>
          <h3 className="text-sm font-semibold mb-3">Datos de contacto</h3>
          <div className="space-y-2 text-gray-700 pl-2">
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
          <h3 className="text-sm font-semibold mb-3">Obra social</h3>
          <div className="space-y-2 text-gray-700 pl-2">
            <p>• {obraSocialNombre || "Sin obra social"}</p>
            {paciente.plan && <p>• Plan: {paciente.plan}</p>}
          </div>
        </section>

        {/* INFORMACIÓN MÉDICA */}
        <section>
          <h3 className="text-sm font-semibold mb-3">Información médica</h3>

          <div className="space-y-2 text-gray-700 pl-2">
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
          <h3 className="text-sm font-semibold mb-3">Consentimientos</h3>

          <div className="space-y-2 text-gray-700 pl-2">
            {/* Consentimiento */}
            <p className="flex items-center gap-2">
              {paciente.consentimientoFirmado ? (
                <Check className="text-green-600 w-4 h-4" />
              ) : (
                <XCircle className="text-red-600 w-4 h-4" />
              )}
              Consentimiento firmado
            </p>

            {/* Indicaciones */}
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

            {/* Estado */}
            <p className="flex items-center gap-2">
              Estado:{" "}
              <strong
                className={paciente.estado === "ACTIVO" ? "text-green-700" : ""}
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
      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold mb-4">Acciones rápidas</h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <ActionButton
            icon={<UserCircle2 className="w-5 h-5" />}
            label="Datos completos"
          />
          <ActionButton
            icon={<ClipboardList className="w-5 h-5" />}
            label="Historia clínica"
          />
          <ActionButton
            icon={<Wallet className="w-5 h-5" />}
            label="Cuenta corriente"
          />
          <ActionButton
            icon={<CalendarDays className="w-5 h-5" />}
            label="Turnos"
          />
          <ActionButton
            icon={<MessageSquare className="w-5 h-5" />}
            label="Mensajes internos"
          />
        </div>
      </div>
    </div>
  );
}

// COMPONENTE REUTILIZABLE PARA LOS BOTONES
function ActionButton({ icon, label }: any) {
  return (
    <button className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-muted transition text-sm">
      <span className="mb-2">{icon}</span>
      {label}
    </button>
  );
}

'use client';

import { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  MapPin,
  Stethoscope,
  FileText,
  AlertTriangle,
  Heart,
  UserCircle,
  Edit,
  ChevronLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLiveTurnoStore } from '@/store/live-turno.store';
import { usePaciente } from '@/hooks/usePaciente';
import DatosCompletos from '@/components/patient/PatientDrawer/views/DatosCompletos';
import { MedicalChips } from '@/components/ui/MedicalChips';

export function DatosPacienteTab() {
  const { session } = useLiveTurnoStore();
  const { data: paciente, isLoading, refetch } = usePaciente(session?.pacienteId || null);
  const [isEditing, setIsEditing] = useState(false);

  if (!session) return null;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No se encontraron datos del paciente
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si está en modo edición, mostrar DatosCompletos
  if (isEditing) {
    return (
      <div className="max-w-3xl mx-auto">
        <DatosCompletos
          paciente={paciente}
          onBack={() => {
            setIsEditing(false);
            refetch(); // Refrescar datos después de editar
          }}
        />
      </div>
    );
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-AR');
  };

  const calcularEdad = (fecha?: string | null) => {
    if (!fecha) return null;
    const diff = Date.now() - new Date(fecha).getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };

  const edad = calcularEdad(paciente.fechaNacimiento);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header con botón de editar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Datos del Paciente</h2>
        <Button variant="outline" onClick={() => setIsEditing(true)}>
          <Edit className="w-4 h-4 mr-2" />
          Editar datos
        </Button>
      </div>

      {/* Alertas Médicas - Prominente */}
      {((paciente as any).alergias?.length > 0 || (paciente as any).condiciones?.length > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Alertas Medicas
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {(paciente as any).alergias?.length > 0 && (
              <MedicalChips
                title="Alergias"
                items={(paciente as any).alergias}
                variant="destructive"
              />
            )}
            {(paciente as any).condiciones?.length > 0 && (
              <MedicalChips
                title="Condiciones"
                items={(paciente as any).condiciones}
                variant="secondary"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Básica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informacion Personal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <span className="text-sm text-gray-500">Nombre completo</span>
              <p className="font-medium">{paciente.nombreCompleto}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">DNI</span>
              <p className="font-medium">{paciente.dni || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Fecha de nacimiento</span>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                {formatDate(paciente.fechaNacimiento)}
                {edad && <span className="text-gray-500">({edad} años)</span>}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Estado</span>
              <p>
                <Badge
                  variant={
                    paciente.estado === 'ACTIVO'
                      ? 'default'
                      : paciente.estado === 'QUIRURGICO'
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {paciente.estado}
                </Badge>
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-sm text-gray-500">Direccion</span>
              <p className="font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                {(paciente as any).direccion || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Contacto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <span className="text-sm text-gray-500">Telefono</span>
              <p className="font-medium flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                {paciente.telefono || '-'}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Telefono alternativo</span>
              <p className="font-medium">
                {(paciente as any).telefonoAlternativo || '-'}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-sm text-gray-500">Email</span>
              <p className="font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                {paciente.email || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Clínica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Informacion Clinica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <span className="text-sm text-gray-500">Diagnostico</span>
              <p className="font-medium">{(paciente as any).diagnostico || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Tratamiento</span>
              <p className="font-medium">{(paciente as any).tratamiento || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Objetivos</span>
              <p className="font-medium">{(paciente as any).objetivos || '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Deriva</span>
                <p className="font-medium">{(paciente as any).deriva || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Lugar intervencion</span>
                <p className="font-medium">{(paciente as any).lugarIntervencion || '-'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Obra Social */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Obra Social / Prepaga
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <span className="text-sm text-gray-500">Obra Social</span>
              <p className="font-medium">
                {paciente.obraSocial?.nombre || 'Sin obra social'}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Plan</span>
              <p className="font-medium">{paciente.plan || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacto de Emergencia */}
      {((paciente as any).contactoEmergenciaNombre || (paciente as any).contactoEmergenciaTelefono) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5" />
              Contacto de Emergencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <span className="text-sm text-gray-500">Nombre</span>
                <p className="font-medium">
                  {(paciente as any).contactoEmergenciaNombre || '-'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Relacion</span>
                <p className="font-medium">
                  {(paciente as any).contactoEmergenciaRelacion || '-'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Telefono</span>
                <p className="font-medium">
                  {(paciente as any).contactoEmergenciaTelefono || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

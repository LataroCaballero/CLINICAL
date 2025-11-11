"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface PatientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: any;
}

export default function PatientFormModal({
  open,
  onOpenChange,
  editData,
}: PatientFormModalProps) {
  const [form, setForm] = useState({
    nombre: editData?.nombre || "",
    dni: editData?.dni || "",
    telefono: editData?.telefono || "",
    email: editData?.email || "",
    obraSocial: editData?.obraSocial || "",
    plan: editData?.plan || "",
    alergias: editData?.alergias || "",
    condiciones: editData?.condiciones || "",
    contactoEmergencia: editData?.contactoEmergencia || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    console.log("Paciente guardado:", form);
    onOpenChange(false);
  };

  const obrasSociales = [
    { nombre: "OSDE", planes: ["210", "310", "410"] },
    { nombre: "Swiss Medical", planes: ["SMG20", "SMG30"] },
    { nombre: "Galeno", planes: ["220", "330", "550"] },
  ];
  
  const selectedObra = obrasSociales.find(
    (o) => o.nombre === form.obraSocial
  );
  const planesDisponibles = selectedObra ? selectedObra.planes : [];
  

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {editData ? "Editar paciente" : "Nuevo paciente"}
          </DialogTitle>
          <DialogDescription>
            Completá los datos del paciente. Podrás editarlos más adelante.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="datos" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="datos">Datos personales</TabsTrigger>
            <TabsTrigger value="obraSocial">Obra social</TabsTrigger>
            <TabsTrigger value="otros">Otros</TabsTrigger>
          </TabsList>

          {/* TAB 1 - DATOS PERSONALES */}
          <TabsContent value="datos" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre completo</Label>
                <Input name="nombre" value={form.nombre} onChange={handleChange} />
              </div>
              <div>
                <Label>DNI</Label>
                <Input name="dni" value={form.dni} onChange={handleChange} />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input name="telefono" value={form.telefono} onChange={handleChange} />
              </div>
              <div>
                <Label>Email</Label>
                <Input name="email" type="email" value={form.email} onChange={handleChange} />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2 - OBRA SOCIAL */}
            <TabsContent value="obraSocial" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                <Label>Obra social</Label>

                {/* Dropdown + entrada libre */}
                <Select
                    onValueChange={(value) =>
                    setForm((prev) => ({
                        ...prev,
                        obraSocial: value === "custom" ? "" : value,
                        plan: "", // reset plan al cambiar
                    }))
                    }
                >
                    <SelectTrigger>
                    <SelectValue
                        placeholder={
                        form.obraSocial
                            ? form.obraSocial
                            : "Seleccionar o escribir obra social"
                        }
                    />
                    </SelectTrigger>
                    <SelectContent>
                    {obrasSociales.map((obra) => (
                        <SelectItem key={obra.nombre} value={obra.nombre}>
                        {obra.nombre}
                        </SelectItem>
                    ))}
                    <SelectItem value="custom">Otra (escribir manualmente)</SelectItem>
                    </SelectContent>
                </Select>

                {/* Campo libre si no está precargada */}
                {!form.obraSocial && (
                    <Input
                    placeholder="Escribí el nombre de la obra social"
                    value={form.obraSocial}
                    onChange={(e) =>
                        setForm((prev) => ({ ...prev, obraSocial: e.target.value }))
                    }
                    className="mt-2"
                    />
                )}
                </div>

                <div>
                <Label>Plan</Label>
                {planesDisponibles.length > 0 ? (
                    <Select
                    onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, plan: value }))
                    }
                    >
                    <SelectTrigger>
                        <SelectValue
                        placeholder={
                            form.plan ? form.plan : "Seleccionar plan disponible"
                        }
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {planesDisponibles.map((p) => (
                        <SelectItem key={p} value={p}>
                            {p}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                ) : (
                    <Input
                    placeholder="Escribí el plan (si aplica)"
                    value={form.plan}
                    onChange={(e) =>
                        setForm((prev) => ({ ...prev, plan: e.target.value }))
                    }
                    />
                )}
                </div>
            </div>
            </TabsContent>


          {/* TAB 3 - OTROS DATOS */}
          <TabsContent value="otros" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div>
                <Label>Contacto de emergencia</Label>
                <Input
                  name="contactoEmergencia"
                  value={form.contactoEmergencia}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label>Alergias</Label>
                <Textarea
                  name="alergias"
                  value={form.alergias}
                  onChange={handleChange}
                  placeholder="Ej. Penicilina, anestesia..."
                />
              </div>
              <div>
                <Label>Condiciones preexistentes</Label>
                <Textarea
                  name="condiciones"
                  value={form.condiciones}
                  onChange={handleChange}
                  placeholder="Ej. Hipertensión, diabetes..."
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
            onClick={handleSave}
          >
            Guardar paciente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

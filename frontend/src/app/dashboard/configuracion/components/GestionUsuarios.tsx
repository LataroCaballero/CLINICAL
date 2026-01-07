"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useUsuarios, useCreateUsuario, useDeleteUsuario } from "@/hooks/useUsuarios";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ROL_OPTIONS = [
  { value: "PROFESIONAL", label: "Profesional" },
  { value: "SECRETARIA", label: "Secretaria" },
  { value: "FACTURADOR", label: "Facturador" },
] as const;

const ROL_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-800",
  PROFESIONAL: "bg-blue-100 text-blue-800",
  SECRETARIA: "bg-green-100 text-green-800",
  FACTURADOR: "bg-orange-100 text-orange-800",
  PACIENTE: "bg-gray-100 text-gray-800",
};

export default function GestionUsuarios() {
  const { data: usuarios = [], isLoading } = useUsuarios();
  const createUsuario = useCreateUsuario();
  const deleteUsuario = useDeleteUsuario();

  const [openCreate, setOpenCreate] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [formData, setFormData] = React.useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    rol: "PROFESIONAL" as "PROFESIONAL" | "SECRETARIA" | "FACTURADOR",
    telefono: "",
  });

  const resetForm = () => {
    setFormData({
      nombre: "",
      apellido: "",
      email: "",
      password: "",
      rol: "PROFESIONAL",
      telefono: "",
    });
    setShowPassword(false);
  };

  const handleCreate = async () => {
    if (!formData.nombre || !formData.apellido || !formData.email || !formData.password) {
      toast.error("Completá todos los campos obligatorios");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    try {
      await createUsuario.mutateAsync({
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        password: formData.password,
        rol: formData.rol,
        telefono: formData.telefono || undefined,
      });
      toast.success("Usuario creado correctamente");
      setOpenCreate(false);
      resetForm();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Error al crear el usuario");
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${nombre}?`)) return;

    try {
      await deleteUsuario.mutateAsync(id);
      toast.success("Usuario eliminado");
    } catch {
      toast.error("Error al eliminar el usuario");
    }
  };

  // Filtrar solo usuarios que no son ADMIN ni PACIENTE
  const usuariosFiltrados = usuarios.filter(
    (u) => u.rol !== "ADMIN" && u.rol !== "PACIENTE"
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestión de Usuarios</CardTitle>
          <Button onClick={() => setOpenCreate(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>
        </CardHeader>
        <CardContent>
          {usuariosFiltrados.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay usuarios registrados. Creá el primero.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuariosFiltrados.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">
                      {usuario.nombre} {usuario.apellido}
                    </TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>
                      <Badge className={ROL_COLORS[usuario.rol] || ""}>
                        {usuario.rol}
                      </Badge>
                    </TableCell>
                    <TableCell>{usuario.telefono || "-"}</TableCell>
                    <TableCell>
                      {format(new Date(usuario.createdAt), "dd/MM/yyyy", {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleDelete(
                            usuario.id,
                            `${usuario.nombre} ${usuario.apellido}`
                          )
                        }
                        disabled={deleteUsuario.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Crear Usuario */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo usuario</DialogTitle>
            <DialogDescription>
              Ingresá los datos del nuevo usuario. Recibirá acceso al sistema
              con el email y contraseña que definas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Juan"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apellido">Apellido *</Label>
                <Input
                  id="apellido"
                  value={formData.apellido}
                  onChange={(e) =>
                    setFormData({ ...formData, apellido: e.target.value })
                  }
                  placeholder="Pérez"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="usuario@clinica.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rol">Rol *</Label>
              <select
                id="rol"
                className="border rounded-md px-3 py-2 text-sm"
                value={formData.rol}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rol: e.target.value as "PROFESIONAL" | "SECRETARIA" | "FACTURADOR",
                  })
                }
              >
                {ROL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) =>
                  setFormData({ ...formData, telefono: e.target.value })
                }
                placeholder="Opcional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpenCreate(false);
                resetForm();
              }}
              disabled={createUsuario.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createUsuario.isPending}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              {createUsuario.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Crear Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

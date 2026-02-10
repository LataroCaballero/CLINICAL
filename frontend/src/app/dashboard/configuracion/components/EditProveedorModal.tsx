"use client";

import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";
import { useUpdateProveedor } from "@/hooks/useProveedores";
import { Proveedor } from "@/types/stock";
import { toast } from "sonner";

interface EditProveedorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedor: Proveedor | null;
  onSuccess: () => void;
}

export default function EditProveedorModal({
  open,
  onOpenChange,
  proveedor,
  onSuccess,
}: EditProveedorModalProps) {
  const [nombre, setNombre] = useState("");
  const [cuit, setCuit] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");

  const updateProveedor = useUpdateProveedor();

  useEffect(() => {
    if (proveedor) {
      setNombre(proveedor.nombre);
      setCuit(proveedor.cuit || "");
      setTelefono(proveedor.telefono || "");
      setEmail(proveedor.email || "");
      setDireccion(proveedor.direccion || "");
    }
  }, [proveedor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proveedor || !nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    try {
      await updateProveedor.mutateAsync({
        id: proveedor.id,
        data: {
          nombre: nombre.trim(),
          cuit: cuit.trim() || undefined,
          telefono: telefono.trim() || undefined,
          email: email.trim() || undefined,
          direccion: direccion.trim() || undefined,
        },
      });
      toast.success("Proveedor actualizado correctamente");
      onSuccess();
    } catch {
      toast.error("Error al actualizar el proveedor");
    }
  };

  if (!proveedor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Proveedor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              placeholder="Nombre del proveedor"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cuit">CUIT</Label>
              <Input
                id="cuit"
                placeholder="XX-XXXXXXXX-X"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                placeholder="+54 11 1234-5678"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="contacto@proveedor.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              placeholder="Dirección del proveedor"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateProveedor.isPending || !nombre.trim()}
            >
              {updateProveedor.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useWabaConfig } from "@/hooks/useWabaConfig";
import { useSaveWabaConfig } from "@/hooks/useSaveWabaConfig";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function WhatsappConfigTab() {
  const { data: config, isLoading } = useWabaConfig();
  const { mutate: saveConfig, isPending } = useSaveWabaConfig();

  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    saveConfig(
      { phoneNumberId, accessToken, wabaId: wabaId || undefined },
      {
        onSuccess: () => {
          toast.success("WhatsApp Business conectado correctamente");
          setPhoneNumberId("");
          setAccessToken("");
          setWabaId("");
          setShowForm(false);
        },
        onError: (error: unknown) => {
          const axiosError = error as {
            response?: { data?: { message?: string } };
            message?: string;
          };
          const mensaje =
            axiosError?.response?.data?.message ||
            axiosError?.message ||
            "Error al conectar con Meta API. Verificá las credenciales.";
          setFormError(mensaje);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Business</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Cargando configuración...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Business</CardTitle>
        <CardDescription>
          Conectá tu número de WhatsApp Business API (WABA) para enviar mensajes
          automáticos a los pacientes.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Estado actual de conexión */}
        {config?.activo && !showForm ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border border-green-200 bg-green-50">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="default"
                    className="bg-green-600 hover:bg-green-600 text-white"
                  >
                    Conectado
                  </Badge>
                </div>
                {config.verifiedName && (
                  <p className="text-sm font-medium text-green-800">
                    {config.verifiedName}
                  </p>
                )}
                {config.displayPhone && (
                  <p className="text-sm text-green-700">{config.displayPhone}</p>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              Actualizar configuración
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumberId">Phone Number ID</Label>
              <Input
                id="phoneNumberId"
                placeholder="Ej: 1234567890123456"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                required
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Encontralo en Meta for Developers › Tu app › WhatsApp › Getting
                started.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                type="password"
                placeholder="••••••••••••••••"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                required
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                El token se cifra antes de guardarse. Solo ingresalo si estás
                reconectando.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wabaId">
                WABA ID{" "}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <Input
                id="wabaId"
                placeholder="Ej: 1234567890123456"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                disabled={isPending}
              />
            </div>

            {formError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-700">{formError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Conectando..." : "Conectar WhatsApp"}
              </Button>
              {config?.activo && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setFormError(null);
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

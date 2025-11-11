"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-linear-to-br from-[#f9fafb] to-[#eef2ff] flex items-center justify-center px-4">
      <Card className="w-full max-w-sm shadow-lg border-0 bg-white/70 backdrop-blur">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight text-[#3b3b58]">
            Iniciar sesión
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">Accedé al sistema del consultorio</p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-600">Correo electrónico</label>
              <Input
                type="email"
                placeholder="ejemplo@correo.com"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Contraseña</label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
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
            <Button className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium">
              Ingresar
            </Button>
          </form>
          <div className="text-center mt-4">
            <Link
              href="#"
              className="text-sm text-[#6366f1] hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

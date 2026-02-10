"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import {
  CuentaCorrienteProveedor,
  MovimientoCCProveedor,
  CuotaOrdenCompra,
  CuotaConProveedor,
  ResumenDeudasProveedores,
  RegistrarPagoProveedorInput,
  PagarCuotaInput,
  EstadoCuota,
} from "@/types/proveedores-financiero";

// List all provider accounts
export function useCuentasCorrientesProveedores(filters?: {
  soloConDeuda?: boolean;
}) {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<CuentaCorrienteProveedor[], Error>({
    queryKey: ["cuentas-corrientes-proveedores", professionalId, filters],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data } = await api.get("/cuentas-corrientes-proveedores", {
        params: {
          profesionalId: professionalId,
          soloConDeuda: filters?.soloConDeuda,
        },
      });
      return data;
    },
  });
}

// Get single provider account
export function useCuentaCorrienteProveedor(proveedorId: string | null) {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<CuentaCorrienteProveedor, Error>({
    queryKey: [
      "cuenta-corriente-proveedor",
      proveedorId,
      professionalId,
    ],
    enabled: !!proveedorId && !!professionalId,
    queryFn: async () => {
      const { data } = await api.get(
        `/cuentas-corrientes-proveedores/${proveedorId}`,
        {
          params: { profesionalId: professionalId },
        }
      );
      return data;
    },
  });
}

// Get provider account movements
export function useMovimientosCCProveedor(proveedorId: string | null) {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<MovimientoCCProveedor[], Error>({
    queryKey: [
      "movimientos-cc-proveedor",
      proveedorId,
      professionalId,
    ],
    enabled: !!proveedorId && !!professionalId,
    queryFn: async () => {
      const { data } = await api.get(
        `/cuentas-corrientes-proveedores/${proveedorId}/movimientos`,
        {
          params: { profesionalId: professionalId },
        }
      );
      return data;
    },
  });
}

// Get provider installments
export function useCuotasProveedor(
  proveedorId: string | null,
  estado?: EstadoCuota
) {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<CuotaOrdenCompra[], Error>({
    queryKey: [
      "cuotas-proveedor",
      proveedorId,
      professionalId,
      estado,
    ],
    enabled: !!proveedorId && !!professionalId,
    queryFn: async () => {
      const { data } = await api.get(
        `/cuentas-corrientes-proveedores/${proveedorId}/cuotas`,
        {
          params: { profesionalId: professionalId, estado },
        }
      );
      return data;
    },
  });
}

// Register payment to provider
export function useRegistrarPagoProveedor() {
  const queryClient = useQueryClient();
  const professionalId = useEffectiveProfessionalId();

  return useMutation({
    mutationFn: async ({
      proveedorId,
      data,
    }: {
      proveedorId: string;
      data: RegistrarPagoProveedorInput;
    }) => {
      const response = await api.post(
        `/cuentas-corrientes-proveedores/${proveedorId}/pagos`,
        data,
        {
          params: { profesionalId: professionalId },
        }
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["cuentas-corrientes-proveedores"],
      });
      queryClient.invalidateQueries({
        queryKey: ["cuenta-corriente-proveedor", variables.proveedorId],
      });
      queryClient.invalidateQueries({
        queryKey: ["movimientos-cc-proveedor", variables.proveedorId],
      });
      queryClient.invalidateQueries({
        queryKey: ["cuotas-proveedor", variables.proveedorId],
      });
      queryClient.invalidateQueries({
        queryKey: ["resumen-deudas-proveedores"],
      });
      queryClient.invalidateQueries({
        queryKey: ["cuotas-vencidas"],
      });
      queryClient.invalidateQueries({
        queryKey: ["cuotas-proximas"],
      });
    },
  });
}

// Pay specific installment
export function usePagarCuota() {
  const queryClient = useQueryClient();
  const professionalId = useEffectiveProfessionalId();

  return useMutation({
    mutationFn: async ({
      cuotaId,
      data,
    }: {
      cuotaId: string;
      data: PagarCuotaInput;
    }) => {
      const response = await api.post(
        `/cuentas-corrientes-proveedores/cuotas/${cuotaId}/pagar`,
        data,
        {
          params: { profesionalId: professionalId },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["cuentas-corrientes-proveedores"],
      });
      queryClient.invalidateQueries({
        queryKey: ["cuenta-corriente-proveedor"],
      });
      queryClient.invalidateQueries({
        queryKey: ["movimientos-cc-proveedor"],
      });
      queryClient.invalidateQueries({
        queryKey: ["cuotas-proveedor"],
      });
      queryClient.invalidateQueries({
        queryKey: ["resumen-deudas-proveedores"],
      });
      queryClient.invalidateQueries({
        queryKey: ["cuotas-vencidas"],
      });
      queryClient.invalidateQueries({
        queryKey: ["cuotas-proximas"],
      });
    },
  });
}

// Get debt summary
export function useResumenDeudasProveedores() {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<ResumenDeudasProveedores, Error>({
    queryKey: ["resumen-deudas-proveedores", professionalId],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data } = await api.get(
        "/cuentas-corrientes-proveedores/resumen/deudas",
        {
          params: { profesionalId: professionalId },
        }
      );
      return data;
    },
  });
}

// Get overdue installments
export function useCuotasVencidas() {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<CuotaConProveedor[], Error>({
    queryKey: ["cuotas-vencidas", professionalId],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data } = await api.get(
        "/cuentas-corrientes-proveedores/cuotas/vencidas",
        {
          params: { profesionalId: professionalId },
        }
      );
      return data;
    },
  });
}

// Get upcoming installments
export function useCuotasProximas(dias: number = 30) {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<CuotaConProveedor[], Error>({
    queryKey: ["cuotas-proximas", professionalId, dias],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data } = await api.get(
        "/cuentas-corrientes-proveedores/cuotas/proximas",
        {
          params: { profesionalId: professionalId, dias },
        }
      );
      return data;
    },
  });
}

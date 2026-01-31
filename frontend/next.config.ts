import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    domains: ["cdn.jsdelivr.net", "avatars.githubusercontent.com"],
  },
  async redirects() {
    return [
      {
        source: "/dashboard/finanzas/pagos",
        destination: "/dashboard/finanzas/balance?tab=ingresos",
        permanent: true,
      },
      {
        source: "/dashboard/finanzas/cuentas-corrientes",
        destination: "/dashboard/finanzas/balance?tab=cuentas",
        permanent: true,
      },
      {
        source: "/dashboard/finanzas/reportes",
        destination: "/dashboard/finanzas/facturacion?tab=reportes",
        permanent: true,
      },
      {
        source: "/dashboard/finanzas/liquidaciones",
        destination: "/dashboard/finanzas/facturacion?tab=liquidaciones",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

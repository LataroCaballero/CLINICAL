import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    domains: ["cdn.jsdelivr.net", "avatars.githubusercontent.com"],
  },
};

export default nextConfig;

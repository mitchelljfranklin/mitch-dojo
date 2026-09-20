import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Dev-only: allow HMR/dev resources when the app is opened via the LAN
  // IP (e.g. testing from another device on the network).
  allowedDevOrigins: ["192.168.0.10", "172.20.240.1", "172.18.96.1"],
  // PGlite's WASM/ESM assets and the driver adapters must stay externalised
  // or the standalone Docker runtime cannot resolve them.
  serverExternalPackages: [
    "@electric-sql/pglite",
    "pglite-prisma-adapter",
    "@prisma/adapter-pg",
    "@prisma/client",
    // @react-pdf/renderer bundles its own font/web machinery that must run
    // from node_modules in the standalone output.
    "@react-pdf/renderer",
  ],
};

export default nextConfig;

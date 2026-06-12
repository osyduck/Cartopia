import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / CommonJS server-only deps: require them at runtime instead of
  // letting the bundler trace into them (fixes pg-format internal requires).
  serverExternalPackages: ["pg", "pg-format", "bcryptjs"],
};

export default nextConfig;

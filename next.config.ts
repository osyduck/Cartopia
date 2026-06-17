import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained .next/standalone server for the Docker image.
  output: "standalone",
  // Native / CommonJS server-only deps: require them at runtime instead of
  // letting the bundler trace into them (fixes pg-format internal requires).
  serverExternalPackages: [
    "pg",
    "pg-format",
    "bcryptjs",
    "@aws-sdk/client-s3",
    "@aws-sdk/lib-storage",
  ],
};

export default nextConfig;

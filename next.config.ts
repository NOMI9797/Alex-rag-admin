import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Updated for Next.js 16+
  serverExternalPackages: ['pdf-parse', 'mammoth', 'marked'],
  
  // Add empty turbopack config to silence the warning
  turbopack: {},
  
  // Note: instrumentation.ts is automatically detected by Next.js
  // No need to enable it in config
};

export default nextConfig;

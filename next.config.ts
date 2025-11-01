import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Updated for Next.js 16+
  serverExternalPackages: ['pdf-parse', 'mammoth', 'marked'],
  
  // Add empty turbopack config to silence the warning
  turbopack: {},
};

export default nextConfig;

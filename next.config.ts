import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['toyvsnymdhiwnywkbufd.supabase.co'],
    // You can add a loader for even more control
    loader: 'default',
  },
};

export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/collections/all",
        destination: "/products",
        permanent: true,
      },
      {
        source: "/blogs/news",
        destination: "/blogs",
        permanent: true,
      },
      {
        source: "/blogs/news/:slug",
        destination: "/blogs/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

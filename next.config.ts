import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "aayezfpwrvtxnxeywtjn.supabase.co",
        pathname: "/storage/v1/object/public/issue-images/**",
      },
    ],
  },
};

export default nextConfig;



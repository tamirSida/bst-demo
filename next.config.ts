import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin pulls in native/dynamic deps (gRPC, protobuf) that break when
  // bundled into a serverless function — it works in `next dev` but crashes at
  // import on Netlify. Keep it external so it's required from node_modules at
  // runtime instead of being bundled.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;

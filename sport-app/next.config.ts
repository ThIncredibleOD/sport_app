import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to THIS project directory. A stray
  // package-lock.json one level up (C:\xampp\htdocs\sport_app\) makes Next
  // infer the wrong root, which can break production output file tracing.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

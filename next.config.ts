import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile above this directory can make Turbopack infer the wrong
  // workspace root, which breaks asset resolution. Pin it to this project.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;

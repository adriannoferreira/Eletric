import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // gera .next/standalone: só o necessário pra rodar, usado pelo Dockerfile (Dokploy)
  output: "standalone",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

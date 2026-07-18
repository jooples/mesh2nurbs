import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 部署使用 standalone 模式，生成自包含的生产构建
  output: "standalone",
};

export default nextConfig;

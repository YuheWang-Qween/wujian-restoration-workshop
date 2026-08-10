import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // outputFileTracingRoot: path.resolve(__dirname, '../../'),  // Uncomment and add 'import path from "path"' if needed
  /* config options here */
  allowedDevOrigins: ['*.dev.coze.site'],
  // 全站未使用 next/image；此前的 images.remotePatterns hostname '*' 全通配
  // 是闲置配置，且一旦引入 next/image 会把优化端点变成开放图片代理，故移除。
  // 引入 next/image 时按需列出具体域名。
};

export default nextConfig;

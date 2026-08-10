import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 只挡 API：/_next/ 是页面渲染资源（挡了会影响抓取渲染），/static/ 路径不存在
      disallow: ['/api/'],
    },
  };
}

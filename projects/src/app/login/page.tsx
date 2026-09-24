import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';
import { getChaoxingLoginOptions } from '@/lib/chaoxing-client';

export const metadata: Metadata = { title: '登录' };

// 超星是否配置取决于运行环境变量：必须按请求渲染，否则构建环境（无凭据）
// 会把「未配置」状态静态烤进产物，部署后即使配了变量也永远是禁用态。
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return <LoginForm chaoxing={getChaoxingLoginOptions()} />;
}

import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';
import { getChaoxingLoginOptions } from '@/lib/chaoxing-client';

export const metadata: Metadata = { title: '登录' };

export default function LoginPage() {
  return <LoginForm chaoxing={getChaoxingLoginOptions()} />;
}

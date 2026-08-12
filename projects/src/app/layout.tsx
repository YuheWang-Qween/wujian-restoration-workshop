import type { Metadata } from 'next';
import './globals.css';
import { SupabaseConfigProvider } from '@/lib/supabase-config-inject';
import { AuthProvider } from '@/components/workshop/AuthProvider';
import { ProgressSyncProvider } from '@/components/workshop/ProgressSyncProvider';
import { GuideAvatarGate } from '@/components/workshop/GuideAvatarGate';

export const metadata: Metadata = {
  title: {
    default: '走马楼三国吴简 · 简牍修复工坊',
    template: '%s · 简牍修复工坊',
  },
  description:
    '按走马楼三国吴简的实际修复工序组织的教学智能体：揭取、清洗、绑夹与核对、饱水保存、脱色、脱水，六道工序各设一个入口。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <SupabaseConfigProvider>
          <AuthProvider>
            <ProgressSyncProvider>
              {children}
              <GuideAvatarGate />
            </ProgressSyncProvider>
          </AuthProvider>
        </SupabaseConfigProvider>
      </body>
    </html>
  );
}

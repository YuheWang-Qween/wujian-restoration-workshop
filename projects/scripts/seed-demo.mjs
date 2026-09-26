/**
 * 演示学情数据 seed（命令行入口，逻辑在 src/lib/workshop/seed-demo.ts，
 * 与教师端「演示数据」按钮共用同一实现）。
 * 5 个班级 × 10 名学生 = 50 人，班级画像差异化，可重复运行（幂等）。
 * 运行：npx tsx scripts/seed-demo.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { seedDemoData } from '../src/lib/workshop/seed-demo.ts';

const admin = createClient(
  process.env.COZE_SUPABASE_URL,
  process.env.COZE_SUPABASE_SERVICE_ROLE_KEY,
);

const result = await seedDemoData(admin);
console.log(
  `完成：共 ${result.seeded} 名演示学生（新建 ${result.created}、复用 ${result.reused}）`,
);

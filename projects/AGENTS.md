# 走马楼吴简修复工坊 · 项目规范

## 这是什么

一个教学智能体，分两篇（`content.ts` 的 `SECTIONS`）：

- **简牍发掘**：按走马楼三国吴简的**实际修复工序**组织成六个环节，每个环节一个独立入口，
  学习者在环节页里读资料、做子问题，答题框草稿存在本机、自答自核。
  六道工序：揭取 → 清洗 → 绑夹与核对 → 饱水保存 → 脱色 → 脱水。
  其中「绑夹与核对」是轻量环节，只设两道子问题，不与其余环节强求对称。
- **简牍展示**：大厅「简牍展示」页签是展厅首页（`ExhibitionHall.tsx`）：篇头（含释文/图版
  转引声明）+ 五个板块入口卡。板块各自独立成页（服务端组件）：
  `/exhibition/discovery`（壹 · 发现与归属四说）、`/exhibition/forms`（贰 · 形制六类展签）、
  `/exhibition/themes`（叁 · 主题八类 + 丘里双轨）、`/exhibition/cases`（肆 · 案例入口）、
  `/exhibition/reference`（伍—捌 · 术语·出版·意义·来源）；五个案例精读在 `/exhibition/case/N`。
  展示篇是**陈列阅读**：没有顺序解锁、没有子问题、没有答题框，小简也不出场。

两块同属一个智能体、一个部署，不拆项目；大厅顶部同排页签切换，不要写成「上篇/下篇」。

发掘篇内容全部出自《长沙走马楼三国吴简的保护与整理》，与 `副本走马楼吴简修复工坊_内容方案.docx` 一一对应。
**展示篇出自另一份材料**：资料汇编《长沙走马楼吴简：种类、主题与释读》
（`assets/长沙走马楼吴简：种类、主题与释读_20260808162227764.docx`），逐段转录进 `exhibition.ts`——
它的口径与发掘篇不同（所录释文均系转引、图版为真实文物照片），两篇的数据不要互相搬用。

> **AI 助教内嵌在数字人里，不另起一页。** 助教链路（`/api/chat`、rubrics.ts、prompt.ts、
> knowledge.ts）从 git 历史（commit `abec6dd`）恢复，服务右下角的对话框 `GuideChat.tsx`；
> `/api/chat` 带鉴权与输入清洗：Supabase 凭据可用时（即部署环境）强制校验 Bearer token，
> 本地无凭据降级放行；messages 只收 user/assistant 纯文本，最多 40 条、单条 4000 字。
> rubrics/prompt/knowledge 首行 `import 'server-only'`，误被客户端引用会直接构建失败。
> 旧的环节页内嵌面板 MentorPanel 没有恢复。知识库数据集 `wujian_knowledge`（三册扫描书）
> 由 knowledge.ts 在服务端检索，扫描页以图片形式随用户消息交给多模态模型。
>
> **数字人向导「小简」有两副面孔，只在环节页出场**（大厅、登录/注册页都没有）：
> 右下角常驻气泡是纯前端预设脚本（`GuideAvatar.tsx` + `guide-lines.ts`），
> 按学生实时位置（当前环节 + 读到的节序号 + 完成记录）切换表情与台词；
> 点击立绘（或气泡里的「问小简」）：立绘向右下缩小退场、就地变换成 `GuideChat`
> 对话框（收起时弹回）；对话框里双方带头像交互——小简圆头像（立绘取头部）在左、
> 学习者字母章（邮箱首字符）在右。
> 上下文实时跟随学生位置：环节维度用 `key=环节id` 重挂重新开场；节维度订阅
> `actsRevealed`（工序说明 / 关键数据 / 子问题），随每个请求把当前节名透传给
> `/api/chat`（`body.act`，prompt.ts 据此注入「学习者当前位置」并按节开场——
> 工序说明节提理解性问题、关键数据节问数据、子问题节才请作答子问题 1(a)），
> 学生在节间翻动时自动补发 hidden 翻节通知（`noRag: true`，不做知识库检索）。
> 对话框收起即卸载，重开重新开场（卸载即中止在途 SSE 流）。
> 桌面端（lg+）对话框展开时环节页正文让位（html[data-wj-chat-open] + .wj-chat-dodge），
> 未解锁环节点立绘不开对话（顺序解锁同一口径）。
> 两处的身份都是「小简」。

## 技术栈

Next.js 16 App Router · React 19 · TypeScript 5 · Tailwind CSS 4 · shadcn/ui ·
Supabase Auth（邮箱密码登录/注册）· zustand（localStorage 持久化，无业务数据库）

## 目录结构

```
src/
├── app/
│   ├── api/supabase-config/route.ts  # 向前端注入 Supabase url/anonKey
│   ├── api/chat/route.ts             # 助教对话：SSE 流式 + 环节材料注入 + 知识库 RAG
│   ├── login/page.tsx、register/page.tsx  # 登录 / 注册（已登录访问自动跳回首页）
│   ├── page.tsx                      # 工坊大厅：两篇页签（?tab=exhibition 落展示篇）+ 六个环节入口
│   ├── stage/[id]/page.tsx           # 环节页：单栏资料 + 子问题 + 答题草稿框
│   ├── exhibition/{discovery,forms,themes,cases,reference}/page.tsx  # 展示篇五个板块独立页
│   ├── exhibition/case/[id]/page.tsx # 展示篇案例精读页 ×5（服务端组件，字段驱动）
│   ├── layout.tsx                    # 挂 AuthProvider（未登录访问业务页跳 /login）
│   └── globals.css                   # 纸墨主题令牌（wj-*）
├── components/workshop/
│   ├── AuthProvider.tsx              # 会话监听 + 路由守卫 + signOut
│   ├── GuideAvatarGate.tsx           # 小简的出场闸门：仅 /stage 路由动态加载（layout 挂它）
│   ├── GuideAvatar.tsx               # 数字人向导「小简」：右下常驻，实时感知页面换台词
│   ├── GuideChat.tsx                 # 小简的 AI 助教对话框：就地展开，接 /api/chat
│   ├── ExhibitionHall.tsx            # 展示篇展厅首页（大厅页签内）：篇头 + 五板块入口卡
│   ├── ExhibitionParts.tsx           # 展示篇共享组件：节标 / 图版卡 / 释文块 / 独立页外壳 ExhibitionShell
│   └── DataTable.tsx                 # 报告原始数据表（展示篇的对照表/出版表也复用它）
├── lib/
│   ├── workshop/content.ts           # 六环节公开内容 —— 会进客户端包
│   ├── workshop/exhibition.ts        # 展示篇全部内容（出自资料汇编 docx，释文系转引）
│   ├── workshop/guide-lines.ts       # 小简的预设台词解析器（事实口径同 content.ts）
│   ├── workshop/prompt.ts            # 助教系统提示词组装 —— 只走服务端
│   ├── workshop/rubrics.ts           # 子问题评阅要点 —— 只走服务端，禁止进客户端包
│   ├── workshop/knowledge.ts         # 知识库检索（wujian_knowledge 扫描页）—— 只走服务端
│   ├── supabase-config-inject.tsx    # 配置注入 Provider（拉 /api/supabase-config）
│   └── supabase-browser.ts           # 浏览器端 Supabase client
├── storage/database/supabase-client.ts  # 服务端 Supabase client（凭据由运行时注入）
└── store/useWorkshopStore.ts         # 完成标记 + 顺序解锁（isStageUnlocked）+ 答题草稿 + 三节阅读进度（一节一屏）
```

## 开发命令

```bash
pnpm dev          # 本地开发
pnpm build        # 生产构建
pnpm ts-check     # 类型检查
pnpm lint:build   # ESLint
pnpm lint:style   # Stylelint
```

## 顺序解锁

六个环节依次解锁：环节 1 常开，环节 N 在 N−1 被读完后解锁（`isStageUnlocked`，
唯一判定口径，大厅卡片、环节页守卫、环节页顶栏/底部导航都走它）。
完成是自动的：环节页检测到「最后一道子问题的答题框已写入内容（非空白）」即调用
`markCompleted` 标记，没有手动标记入口；persist 里恢复出的老答案也会自动补登。
只有大厅的「重置进度」能清空完成记录。

## 内容纪律

- 数据只能来自报告。改动数字前先确认章节出处。
- **展示篇（`exhibition.ts`）是另一套口径**：内容出自资料汇编 docx，所录释文均系**转引**
  （长沙简牍博物馆、简帛网及学者论文等），页面上的「释文说明 / 图版说明」声明不能删；
  照片是真实文物照（`public/exhibition/`，Wikimedia Commons CC0 及博物馆官网、
  中央纪委监察部网站专题配图），**署名必须跟图走**（`ExFigure.credit`），
  与发掘篇的 AI 示意图是两种性质，不得混用标注。汇编里标了「争论」的词条
  （丘与里、二年常限、算与事、真吏给吏、调等）保持诸说并列，不要私自统一。
- 报告不同章节间存在口径差异的六处，登记在 `content.ts` 的 `APPENDIX`。
  新增引用若碰上口径冲突，补进这张表，不要私自统一。
- 「新洁尔灭」（第二章筛选实验）与「复方新洁尔灭」（第三章实际使用）不是同一种药，别合并。
- 「关键数据」节的配图（`public/fig-stage-N.jpeg`）是 AI 生成的**示意图**，图题必须以「示意」开头，
  不得冒充真实文物照片或报告图版；换图时保留这条标注。
- 小简的台词（`guide-lines.ts`）同样只能出自报告，数字口径与 `content.ts` 一致；
  新增台词先找出处，拿不准的数字不要写。立绘是官方提供的透明底形象
  （`public/guide-avatar.png`，源文件 `assets/AI助教.png`），无底悬浮、与文物照片互不相干；
  `guide-lines.ts` 的 mood 四态（微笑/讲解/思索/欢喜）保留，待官方表情差分图到位后按态切换。

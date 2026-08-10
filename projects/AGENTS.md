# 走马楼吴简修复工坊 · 项目规范

## 这是什么

一个教学智能体，分两篇（`content.ts` 的 `SECTIONS`）：

- **简牍发掘**：按走马楼三国吴简的**实际修复工序**组织成六个环节，每个环节一个独立入口，
  学习者在环节页里读资料、做细问，答题框草稿存在本机、自答自核。
  六道工序：揭取 → 清洗 → 绑夹与核对 → 饱水保存 → 脱色 → 脱水。
  其中「绑夹与核对」是轻量环节，只设两道细问，不与其余环节强求对称。
- **简牍展示**：大厅「简牍展示」页签是展厅首页（`ExhibitionHall.tsx`）：无篇头，
  直接五个板块入口卡。板块各自独立成页（服务端组件）：
  `/exhibition/discovery`（壹 · 发现与归属四说）、`/exhibition/forms`（贰 · 形制六类展签）、
  `/exhibition/themes`（叁 · 主题八类 + 丘里双轨）、`/exhibition/cases`（肆 · 案例入口）、
  `/exhibition/reference`（伍—捌 · 术语·出版·意义·来源）；五个案例精读在 `/exhibition/case/N`。
  展示篇是**陈列阅读**：没有顺序解锁、没有细问、没有答题框，小简也不出场。

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
> 上下文实时跟随学生位置：环节维度用 `key=环节id` 重挂清空重来；节维度订阅
> `actsRevealed`（工序说明 / 关键数据 / 细问），随每个请求把当前节名透传给
> `/api/chat`（`body.act`，prompt.ts 据此注入「学习者当前位置」）。
> **小简不主动开场**：面板打开即空对话（空态提示「直接开口」），等学习者先开口；
> 学习者未开口前翻节不推送 hidden 通知（开口后才随翻节补发，`noRag: true` 不检索）；
> 唯一的小简先发言场景是题卡「问小简这道题」唤起（学习者的明确提问动作，hidden 直达）。
> 对话框收起即卸载（中止在途 SSE 流），重开为空对话。
> 对话面板固定在顶栏（h-14）以下、视口右侧（lg+ 24rem 宽，<lg 全宽覆盖），顶栏全宽恒可见；
> 面板展开时环节页正文滚动区让位（html[data-wj-chat-open] + .wj-chat-dodge，
> 面板宽度断点与让位断点必须同挂 lg——历史上面板 sm:w-96 而让位 lg 起，sm~lg 区间浮窗遮正文），
> 未解锁环节点立绘不开对话（顺序解锁同一口径）。
> 两处的身份都是「小简」。
>
> **AI 判对错**（环节页每个答题框下）：学生写完某框答案后点「AI 判对错」，
> 前端把该框答案（含环节/题目/小问定位）交给 `/api/grade`；服务端用
> `grade-prompt.ts` 组装判分指令（题目 + rubrics.ts 评阅要点 + 输出纪律），
> SSE 回流：首帧是判定章（成立/部分成立/不成立，服务端从模型输出的
> 「判定：X\n---」头部解析，正则优先匹配长词「部分成立」），后续是流式解析
> （点依据 → 点缺口 → 给一个能自己走下去的方向，不端完整标准答案）。
> 答案一改旧判定即在前端作废；判对错与对话同一套鉴权口径，限速桶独立（15 次/分）。
>
> **确认提交与参考答案**（答题流程闭环）：学生可反复改稿、反复点判对错；
> 点「确认提交」（两段式，先提示"提交后即定稿"再确认）后该框定稿——输入锁定、
> 判对错按钮隐藏、判定章保留，并自动向 `/api/reference-answer` 拉取参考答案
> （SSE 纯 content 流，无 verdict 章）。参考答案**每小问只生成一次**：完整走完
> done 帧的成稿写入 store（`referenceAnswers`，persist 持久化），刷新/重进直接读缓存；
> 中途断开/出错不缓存半成品，界面给「重试」。store 的 `submitted` /
> `referenceAnswers` 以 answerKey 为键，partialize 与 resetAll 都要同步维护。
> 接口骨架与 /api/grade 一致（鉴权/限速 10 次/分/心跳/deadline），prompt 由
> grade-prompt.ts 的 `buildReferenceAnswerUserMsg` 组装（与判分共用 `resolveQuestion`）；
> 撰写纪律要求纯文本分点、不出现 markdown 语法与「参考答案」字样。
>
> **题型机制**：细问不限于问答，共五种作答形式（缺省=文本框）。小问数据带
> `WjPart.input`：
> `ordering` 分层排序（`→` 分隔层、同层 `、` 并列表示先后不确定；点层选中后点单位入层，
> 层可增删/上移，附补充说明框，如 1-q1(a)。**合法排列不唯一**：任何满足给定先后约束的
> 序列都算排列正确，判分纪律与 rubric 均按「约束不冲突即认可」写，禁止要求与某一
> 示例排列一致；不确定性的指出是独立维度）、
> `choice` 单选（如 2-q1(a)）、`multi` 多选（如 3-q2(b)、4-q1(b)）、
> `matching` 左右匹配（5-q3(a)）、`drawing` 画板作答（2-q3(a) 画横断面示意图）；
> choice/multi 的 `withNote: true` 附补充说明框（理由/依据由它承载，此时说明为必答）。
> **drawing 题**：前端 DrawingCanvas（canvas 画笔/橡皮/清空/撤销，导出 base64 PNG），
> 判分走多模态——grade 路由把 image 作为 `image_url` content part 发给视觉模型
> （doubao-seed-2-0-lite 支持 Image 输入），系统提示词告知模型这是画图题、
> 按评阅要点判断图的完整性；参考答案为文本描述（描述应画什么）。
> **判断题不做独立题型**：1-q2 拆成 (a)~(e) 五个小问，每问是 `choice`（选项「正/误」）
> + withNote 说明——逐条作答、逐条判对错、逐条提交出参考答案（「做一题提交一题」）；
> 其评阅要点按小问级 key 存放（`'1-q2.a'`~`'1-q2.e'`，`getRubric` 先查小问级再回落题级）。
> 结构化答案**序列化为纯文本协议**存入 answers（与文本题共用存储、判对错与问小简通道）：
> `排序：a → b → c①、c②`、`选择：B`、`多选：A、C`（三者 + 可选 `补充：…` 行）、
> `匹配：A→②；B→①`；drawing 题无文本协议（以 image base64 传输）；
> 作答组件视觉纪律：选项/匹配项的 key 与正文同字号同字重（`text-[15px]`，不用 mono/badge，
> 选中态只用 cinnabar 颜色区分），分隔用中点「·」；mono 只留给真正的编号与数据。
> chat 与判分的系统提示词都写有「格式约定」教模型读协议，且 prompt.ts / grade-prompt.ts
> 组装题目时经 `describeInput()`（prompt.ts 导出、两边共用）把选项/待排项/匹配列
> 注入题干（题干 text 不再含选项）。
> 新增题型时：扩展 `WjPartInput` 联合类型 + 作答组件 + 协议格式 + 两处提示词的约定说明。
> 判分模块字段注意：题目是 `kind`/`stem`、小问是 `label`/`text`（dev 转译不查类型，
> 写错字段名不会报错、只会静默输出 undefined，改动后应跑 `pnpm ts-check`）。

## 技术栈

Next.js 16 App Router · React 19 · TypeScript 5 · Tailwind CSS 4 · shadcn/ui ·
Supabase Auth（邮箱密码登录/注册）· zustand（localStorage 持久化，无业务数据库）

## 目录结构

```
src/
├── app/
│   ├── api/supabase-config/route.ts  # 向前端注入 Supabase url/anonKey
│   ├── api/chat/route.ts             # 助教对话：SSE 流式 + 环节材料注入 + 知识库 RAG
│   ├── api/grade/route.ts            # AI 判对错：SSE 流式判定（verdict 章 + 流式解析）
│   ├── api/reference-answer/route.ts # 参考答案：确认提交后 SSE 流式生成（纯 content 流）
│   ├── login/page.tsx、register/page.tsx  # 登录 / 注册（已登录访问自动跳回首页）
│   ├── page.tsx                      # 工坊大厅：两篇页签（?tab=exhibition 落展示篇）+ 六个环节入口
│   ├── stage/[id]/page.tsx           # 环节页：单栏资料 + 细问 + 答题草稿框
│   ├── exhibition/{discovery,forms,themes,cases,reference}/page.tsx  # 展示篇五个板块独立页
│   ├── exhibition/case/[id]/page.tsx # 展示篇案例精读页 ×5（服务端组件，字段驱动）
│   ├── layout.tsx                    # 挂 AuthProvider（未登录访问业务页跳 /login）
│   └── globals.css                   # 纸墨主题令牌（wj-*）
├── components/workshop/
│   ├── AuthProvider.tsx              # 会话监听 + 路由守卫 + signOut
│   ├── GuideAvatarGate.tsx           # 小简的出场闸门：仅 /stage 路由动态加载（layout 挂它）
│   ├── GuideAvatar.tsx               # 数字人向导「小简」：右下常驻，实时感知页面换台词
│   ├── GuideChat.tsx                 # 小简的 AI 助教对话框：就地展开，接 /api/chat
│   ├── ExhibitionHall.tsx            # 展示篇展厅首页（大厅页签内）：五板块入口卡
│   ├── ExhibitionParts.tsx           # 展示篇共享组件：节标 / 图版卡 / 释文块 / 独立页外壳 ExhibitionShell
│   └── DataTable.tsx                 # 报告原始数据表（展示篇的对照表/出版表也复用它）
├── lib/
│   ├── workshop/content.ts           # 六环节公开内容 —— 会进客户端包
│   ├── workshop/exhibition.ts        # 展示篇全部内容（出自资料汇编 docx，释文系转引）
│   ├── workshop/guide-lines.ts       # 小简的预设台词解析器（事实口径同 content.ts）
│   ├── workshop/prompt.ts            # 助教系统提示词组装 —— 只走服务端
│   ├── workshop/grade-prompt.ts      # 判分 + 参考答案提示词组装（resolveQuestion 共用）—— 只走服务端
│   ├── workshop/rubrics.ts           # 细问评阅要点 —— 只走服务端，禁止进客户端包
│   ├── workshop/knowledge.ts         # 知识库检索（wujian_knowledge 扫描页）—— 只走服务端
│   ├── supabase-config-inject.tsx    # 配置注入 Provider（拉 /api/supabase-config）
│   └── supabase-browser.ts           # 浏览器端 Supabase client
├── storage/database/supabase-client.ts  # 服务端 Supabase client（凭据由运行时注入）
└── store/useWorkshopStore.ts         # 完成标记 + 顺序解锁（isStageUnlocked）+ 答题草稿 + 提交定稿/参考答案缓存 + 三节阅读进度（一节一屏）
```

## 开发命令

```bash
pnpm dev          # 本地开发
pnpm build        # 生产构建
pnpm ts-check     # 类型检查
pnpm lint:build   # ESLint
pnpm lint:style   # Stylelint
```

## 预览与部署

- **预览**：`scripts/dev.sh` 从 `.preview` 读取端口（fallback 5000），绑定 `0.0.0.0`，
  用 `tsx watch src/server.ts` 启动 dev server（自定义 Next.js server，非 `next dev`）。
- **部署构建**：`scripts/build.sh` 执行 `pnpm next build` + `tsup src/server.ts` 打包为 `dist/server.js`。
- **部署启动**：`scripts/start.sh` 用 `node dist/server.js` 启动，端口由 `DEPLOY_RUN_PORT` 或默认 5000。
- 所有脚本基于 `SCRIPT_DIR` 推导 `PROJECT_DIR`，不依赖调用时的 `pwd` 或 `COZE_WORKSPACE_PATH`。
- `.preview` 已在 `.gitignore` 中，不提交 git。
- 本地无 Supabase 凭据时登录功能降级（预期行为），`/api/chat` 按 IP 降级放行。

## 顺序解锁

六个环节依次解锁：环节 1 常开，环节 N 在 N−1 被读完后解锁（`isStageUnlocked`，
唯一判定口径，大厅卡片、环节页守卫、环节页顶栏都走它）。
环节页底部**没有**环节间导航条（已按需求移除「上一节/返回工坊/下一环节」），
环节间往返只走顶栏环节切换与大厅；节内「上一节/接着读」翻节条保留。
完成是自动的：环节页检测到「最后一道细问的答题框已写入内容（非空白）」即调用
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

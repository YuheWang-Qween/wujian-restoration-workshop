# 走马楼吴简修复工坊 · 项目规范

## 这是什么

一个教学智能体，分两篇（`content.ts` 的 `SECTIONS`）：

- **简牍发掘**：按走马楼三国吴简的**实际修复工序**组织成六个环节，每个环节一个独立入口，
  学习者在环节页里读资料、**上虚拟仿真工作台动手**、做细问，答题框草稿存在本机、自答自核。
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
> **`public/wujian-intro.html`**（200KB，四标签页：应用全景 / 宣传文案 / 讲解逐字稿 / 技术路线）
> 是对外介绍项目用的纯静态单文件页——纸墨主题、vanilla JS 切换标签，无构建依赖，
> 直接以静态资源路径访问（`/wujian-intro.html`）；其内容由源码事实人工撰写，
> 项目结构大改时需同步更新（源分片在 /tmp，不持久化，直接改该文件即可）。
> **`public/wujian-stages.png`**（1600×2080）是「简牍发掘 · 六道工序三节结构图」
> 宣传图——六环节卡片（工序名+题词来自 content.ts）× 读/动手/动脑三节 chips +
> 页脚图例，纸墨配色（黛青/朱砂/苔绿），由 Python+Pillow 绘制
> （源脚本 /tmp/draw_stages.py，不持久化；重生成需重写）。
> 点击立绘（或气泡里的「问小简」）：立绘向右下缩小退场、就地变换成 `GuideChat`
> 对话框（收起时弹回）；对话框里双方带头像交互——小简圆头像（立绘取头部）在左、
> 学习者字母章（邮箱首字符）在右。
> 上下文实时跟随学生位置：环节维度用 `key=环节id` 重挂清空重来；节维度订阅
> `actsRevealed`（工序说明 / 关键数据 / 上机操作 / 细问），随每个请求把当前节名透传给
> `/api/chat`（`body.act`，prompt.ts 据此注入「学习者当前位置」）。
> 环节页右缘有「编绳串简」竖向节进度轨道（StageProgressStrip，fixed 常驻、垂直居中，
> 窄屏隐藏——曾试过 header 下方横条，与顶栏视觉冲突已废弃）：已读节墨色竖简片可点击
> 回跳（`revealToAct`），当前节朱砂呼吸、节名小签常显，未到节虚线不可点；细问节带
> `已答/总题` 子进度（口径与完成判定同源 `isQuestionAnswered`，store 导出、环节页与
> 进度条共用）；全部读完末节盖朱印「阅」。样式在 globals.css `.wj-rail*`。
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
> **请小简评阅**（环节页每个答题框下）：学生写完某框答案后点「请小简评阅」，
> 前端把该框答案（含环节/题目/小问定位）交给 `/api/grade`；服务端用
> `grade-prompt.ts` 组装评阅指令（题目 + rubrics.ts 评阅要点 + 输出纪律），
> SSE 回流：首帧是判定章（成立/部分成立/不成立，服务端从模型输出的
> 「判定：X\n---」头部解析，正则优先匹配长词「部分成立」），后续是流式解析
> （点依据 → 点缺口 → 给一个能自己走下去的方向，不端完整标准答案）。
> 答案一改旧判定即在前端作废；评阅与对话同一套鉴权口径，限速桶独立（15 次/分）。
>
> **确认提交与参考答案**（答题流程闭环）：学生可反复改稿、反复点评阅；
> 点「确认提交」（两段式，先提示"提交后即定稿"再确认）后该框定稿——输入锁定、
> 评阅按钮隐藏、判定章保留，并自动向 `/api/reference-answer` 拉取参考答案
> （SSE 纯 content 流，无 verdict 章）。参考答案**每小问只生成一次**：完整走完
> done 帧的成稿写入 store（`referenceAnswers`，persist 持久化），刷新/重进直接读缓存；
> 中途断开/出错不缓存半成品，界面给「重试」。store 的 `submitted` /
> `referenceAnswers` 以 answerKey 为键，partialize 与 resetAll 都要同步维护。
> **作答记录持久化**：`answers`/`verdicts`/`analyses`/`images`/`submitted`/`referenceAnswers`
> 全部 persist 到 localStorage，刷新/重进后从 store 恢复——评阅判定、解析正文、画板图
> 都不丢，学生可接着之前的进度继续。
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
> + withNote 说明——逐条作答、逐条评阅、逐条提交出参考答案（「做一题提交一题」）；
> 其评阅要点按小问级 key 存放（`'1-q2.a'`~`'1-q2.e'`，`getRubric` 先查小问级再回落题级）。
> 结构化答案**序列化为纯文本协议**存入 answers（与文本题共用存储、评阅与问小简通道）：
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
Supabase Auth（超星 OAuth 集成登录为主，未配置 CHAOXING_* 时降级邮箱密码）·
zustand（localStorage 持久化，无业务数据库）

## 超星集成登录（2024-09 接入）

登录主入口已换成超星 OAuth：`/api/auth/chaoxing` 发起 → 超星授权 →
`/api/auth/callback/chaoxing` 服务端解析身份并落成 Supabase 用户（magic link
token）→ 302 到 `/auth/finish?token_hash=` 由**浏览器端** verifyOtp 建立会话。
会话仍落 localStorage（进度同步/成就全走 Bearer token），与超星官方模板的
服务端 Cookie 会话不同——这是有意为之的最小侵入改造。

- `CHAOXING_FIDS` 裸 FID=单按钮静默轮询；`fid:名称`=机构下拉框严格校验（见 .env.example）
- 身份字段存 `app_metadata.chaoxing`（服务端可写才能用于鉴权）；学工号在 `chaoxing.name`（displayName 才是姓名）
- 首页顶栏用 `page.tsx` 里的 UserChip 显示 `user_metadata.full_name/avatar_url`（超星头像 `photo.chaoxing.com/p/{uid}_80`，加载失败回退首字黛青圆标）；不要直接渲染 `user.email`——那是 `chaoxing_<hash>@oauth.invalid` 虚拟邮箱，用户看不懂
- 未配置 CHAOXING_* 时登录页降级：超星按钮禁用 + 显示邮箱密码表单与注册链接（本地开发不被锁死）
- 失败分类四档（config_missing / institution_mismatch / oauth_failed / session_failed），302 到 `/auth/error`，具体原因只进服务端日志
- 部署需在超星后台登记回调 `https://<域名>/api/auth/callback/chaoxing`，并在平台配置四个 CHAOXING_* 变量（README 模板同款流程）
- **登录页必须 `export const dynamic = 'force-dynamic'`**（2024-09 踩坑）：`getChaoxingLoginOptions()` 只读
  process.env，不加该声明 Next 会把「未配置」静态烤进构建产物——部署构建环境（git worktree）没有
  `.env`，线上登录页会永远禁用，即使运行时配了变量也无效。任何读环境变量决定渲染内容的服务端组件都同理。
- 沙箱 `.env` 只作用于 dev 预览（dev.coze.site 域名，登录一直可用）；**线上实例的环境变量来自平台
  环境变量配置**，不随 `.env` 文件部署。线上要启用超星登录需在平台配 CHAOXING_* 四个变量，且
  CHAOXING_REDIRECT_URI 要用线上域名并在超星后台登记对应回调。

### 凭据安全纪律（2024-09 事故教训）

真实凭据只放 `projects/.env`（已被根 .gitignore 忽略）；`projects/.env.example`
永远只写占位符。平台会把改动自动暂存进 index，`git commit` 时会连同暂存区
一起提交——提交前必须 `git status` 检查暂存区，确认没有 .env 或含真实密钥的
文件被扫入。`.env.example` 若被填了真实值，先用占位符版本覆盖再提交。
真实密钥一旦进了远程历史，必须 reset 重建历史 + force push，并到超星后台
轮换 Secret（GitHub 会缓存不可达提交对象）。

### 教师口令身份（2024-09）

登录页两档身份：学生直接超星登录；教师需输口令（当前 123，写死在
LoginForm）解锁超星按钮。角色存 localStorage `wj-role`（每次登录覆盖），
首页顶栏教师显示黛青徽章 + 「学情分析」入口。

### 教师端学情分析 /teacher（2026-09）

**教师首页即学情分析**：`/` 挂载时 `wj-role==='teacher'` 且
sessionStorage 无 `wj-view-as='student'` 标记 → replace('/teacher')；
`/teacher` 顶栏「学生视角」按钮设一次性标记后 push('/') 供教师临时
查看学生端（刷新即回教师端，首页读取后即焚标记）。

三层视图：班级卡片 → 班级学生表 → 学生学情详情（六环节 + 17 题逐题
判定/提交/草稿状态）。班级按**学工号前缀推导**（位数 4/6/8/不分组可调，
默认 6 位，localStorage `wj-teacher-digits`；无学工号归「未编班」；手机号
形态的学工号如 `phone18088...` 需手动切不分组）。数据走
`GET /api/teacher/overview`：登录 Bearer + `x-teacher-passcode`
（比对 `TEACHER_PASSCODE`，缺省 123，与登录页口令同源）双校验；service-role
读 auth.users 元数据 + workshop_progress 全表（画图题只回 imageKeys
不回 dataURL）。细问答完口径与进度条/完成判定共用 store 的 `isQuestionAnswered`。

**口令双通路验证（localStorage 持久化）**：①登录页路径——教师口令
验证通过后 LoginForm 写 localStorage `wj-teacher-passcode`，与 /teacher 的
PASSCODE_STORE 同键，登录后直达学情页免输；②直达路径——本机首次直达
/teacher 且无存储口令时显示口令输入框，输对即进并存本机。**必须用
localStorage 而非 sessionStorage**：超星 OAuth 跳转链路可能换标签页，
sessionStorage 会丢导致登录后仍要求重复输入（已踩坑）。口令验证一次后
本机记住；403 清键重输；学生登录与 `signOut()` 均清除该键防换人残留
（signOut 同时清 `wj-view-as`）。API 服务端双校验保持不变。

### 游客模式（2024-09）

登录页「游客浏览」按钮 → `src/lib/guest-mode.ts`（localStorage `wj-guest`）。
路由守卫与渲染闸门照 `__DEMO_MODE__` 同款旁路放行；作答与 AI 助教不带
Authorization 也能用（服务端本就兼容无凭据）。进度同步以登录 user 为闸，
游客天然只存本机 localStorage。`signOut()` 内部清游客标记（各页退出按钮统一
生效）；真实登录（session 落定）也会自动清。顶栏游客态显示「游客」chip，
退出按钮文案变「退出游客」。

## 目录结构

```
src/
├── app/
│   ├── api/supabase-config/route.ts  # 向前端注入 Supabase url/anonKey
│   ├── api/chat/route.ts             # 助教对话：SSE 流式 + 环节材料注入 + 知识库 RAG
│   ├── api/grade/route.ts            # 请小简评阅：SSE 流式判定（verdict 章 + 流式解析）
│   ├── api/reference-answer/route.ts # 参考答案：确认提交后 SSE 流式生成（纯 content 流）
│   ├── api/auth/chaoxing/route.ts    # 发起超星 OAuth（state=机构FID，登录上下文 Cookie）
│   ├── api/auth/callback/chaoxing/route.ts  # 超星回调：解析身份→建 Supabase 用户→302 到 /auth/finish 带 token_hash
│   ├── login/page.tsx（force-dynamic）  # 登录：超星按钮为唯一登录入口（未配置时禁用+提示），下方「观看演示」入口（调 window.__startDemo）与「游客浏览」；演示按钮只在登录页，顶栏不放
│   ├── auth/finish/page.tsx          # 超星登录客户端收尾：verifyOtp 建立 localStorage 会话
│   ├── auth/error/page.tsx           # 登录失败页：四档错误分类文案
│   ├── page.tsx                      # 工坊大厅：两篇页签（?tab=exhibition 落展示篇）+ 六个环节入口
│   ├── stage/[id]/page.tsx           # 环节页：单栏资料 + 细问 + 答题草稿框
│   ├── exhibition/{discovery,forms,themes,cases,reference}/page.tsx  # 展示篇五个板块独立页
│   ├── exhibition/case/[id]/page.tsx # 展示篇案例精读页 ×5（服务端组件，字段驱动）
│   ├── layout.tsx                    # 挂 AuthProvider（未登录访问业务页跳 /login）+ DemoMode（全局演示组件，挂 window.__startDemo）
│   └── globals.css                   # 纸墨主题令牌（wj-*）
├── components/workshop/
│   ├── AuthProvider.tsx              # 会话监听 + 路由守卫 + signOut（守卫与渲染闸门都有 __DEMO_MODE__ 旁路，未登录也能看演示）
│   ├── GuideAvatarGate.tsx           # 小简的出场闸门：仅 /stage 路由动态加载（layout 挂它）
│   ├── GuideAvatar.tsx               # 数字人向导「小简」：右下常驻，实时感知页面换台词
│   ├── GuideChat.tsx                 # 小简的 AI 助教对话框：就地展开，接 /api/chat
│   ├── StageSim.tsx                  # 虚拟仿真工作台：工步步进 + 指标结算 + 验收报告
│   ├── SimStageView.tsx              # 工作台画面（SVG）：六种场景，简牍状态随指标实时改形
│   ├── ExhibitionHall.tsx            # 展示篇展厅首页（大厅页签内）：五板块入口卡
│   ├── ExhibitionParts.tsx           # 展示篇共享组件：节标 / 图版卡 / 释文块 / 独立页外壳 ExhibitionShell
│   └── DataTable.tsx                 # 报告原始数据表（展示篇的对照表/出版表也复用它）
├── lib/
│   ├── workshop/content.ts           # 六环节公开内容 —— 会进客户端包
│   ├── workshop/sim.ts               # 六台仿真工作台的工步 / 参数区间 / 后果 —— 会进客户端包
│   ├── workshop/exhibition.ts        # 展示篇全部内容（出自资料汇编 docx，释文系转引）
│   ├── workshop/guide-lines.ts       # 小简的预设台词解析器（事实口径同 content.ts）
│   ├── workshop/prompt.ts            # 助教系统提示词组装 —— 只走服务端
│   ├── workshop/grade-prompt.ts      # 判分 + 参考答案提示词组装（resolveQuestion 共用）—— 只走服务端
│   ├── workshop/rubrics.ts           # 细问评阅要点 —— 只走服务端，禁止进客户端包
│   ├── workshop/knowledge.ts         # 知识库检索（wujian_knowledge 扫描页）—— 只走服务端
│   ├── supabase-config-inject.tsx    # 配置注入 Provider（拉 /api/supabase-config）
│   └── supabase-browser.ts           # 浏览器端 Supabase client
├── storage/database/supabase-client.ts  # 服务端 Supabase client（凭据由运行时注入）
└── store/useWorkshopStore.ts         # 完成标记 + 顺序解锁（isStageUnlocked）+ 答题草稿 + 提交定稿/参考答案缓存 + 分节阅读进度（一节一屏）+ 仿真操作记录 simRuns
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

## 虚拟仿真工作台（上机操作节）

六个环节各有一台工作台，排在「关键数据」之后、「细问」之前——**先动手，再被追问**。
学习者不是选 A/B/C/D，而是按真实工序排次序、挑工具、调参数、逐段推进；
每一步落手立刻给后果，四项指标（简体完整度 / 字迹可辨度 / 信息完整度 / 累计工时）
随操作实时跳动，走完出验收报告，可以重新开工。

- **数据层** `lib/workshop/sim.ts`：四种工步类型 `pick`（选工具）/ `dial`（调参数，
  带报告给出的安全带）/ `order`（排次序，按 before 约束判违反）/ `advance`（逐段推进，
  把累积 `risk` 兑现成实际损伤，中途触发处置）。**这份文件进客户端包**——
  后果说明本来就要当场给学习者看，与 rubrics.ts（评阅要点，只走服务端）性质不同。
- **画面** `SimStageView.tsx`：六种场景各自可视化同一套指标（简坨横截面 / 泥污褪去 /
  绑夹漂移 / 菌斑生长 / 温度计与蓝色值 / 收缩形变）。颜色一律走 `var(--wj-*)` 令牌，
  动效走 CSS 类（globals.css 的 `prefers-reduced-motion` 总开关直接管到）。
  逼真度靠四件事，不靠贴图：**材质**（竹片弧面的横向渐变、纵向纤维纹、老化斑、编绳磨痕）、
  **笔墨**（每一笔是起收锋都收细的填充路径，底下垫一层洇墨；ink 越低洇得越开，
  对应报告讲的「墨迹散淡」）、**光**（湿面高光、器物投影、釉面反光）、
  **液体**（液面起伏、水下折射、盘沿弯月面）。
  形制是硬约束：**走马楼竹简长约 23 cm、宽 1 cm 出头，长宽比接近 1:19**——
  画面上做了压缩，但必须保持「细长」这个第一印象，画成宽条就不是简了；
  每列字数由 `Slip` 按几何算出（`h*0.92 / (w*0.68)`），字形才近方。
  脱水时字数按**未收缩**的尺寸算，字才会随简体一起被压扁。
- **每个工步都有对应的动效，分两层**（都是 CSS，`prefers-reduced-motion` 总开关直接管到）：
  **动作**——StageSim 在每次落手（pick / dial / order / tick / event）发一个 `SimCue`
  （步 id + 选项 + nonce），场景用 `<Fx cue step choice>` 命中后渲染一段一次性动作
  （`Flash` 拍照、`Droplets` 点水、`Steam` 升温、`Pour` 下药、`Debris` 崩口、`Ring` 轻震、
  `Heat` 热浪，以及 lift / snap / scrub / flip / draw 几个类），以 nonce 为 key 重挂即重放；
  **过渡**——状态量（刀口位置、泥污退线、汞柱、液色、简的收缩与漂移、色片）挂 `.wj-sim-anim`，
  用 `style.transform` / `fill` 过渡而不是直接改几何，画面不再跳到新状态。
  推进步走完之后 `sceneProgress` 停在 1（StageSim 按 advance 步的下标判断），
  后面的工步不会让泥污或刀口倒回去。新加工步时，至少给它一个 `<Fx>`；
  新加状态量时，用 transform 表达并挂 `.wj-sim-anim`。
- **简面上的笔画不是释文**：只做笔墨质感，不拼成任何可读的字，图注里写明了这一点。
  展示篇的释文有自己的出处与声明，不搬到这里（两篇数据不互相搬用）。
- **性能**：简坨里一坨几十枚简，走的是轻量的 `SlipEnd`（纯 rect，不带滤镜）；
  `Slip` 的泥污滤镜（`feTurbulence`）只在 `mud > 0.02` 时才生成。
  改这两处前先想清楚实例数——六台里最重的揭取台目前约 770 个节点、3 个滤镜。
- **内容纪律与正文同源**：工具、参数区间、失败机制全部出自报告，与 content.ts 的
  why / facts / tables 对得上。**指标的扣分幅度是教学权重，不是报告实测值**——
  起始屏与结算页都写明了这一点，不要把它当成报告数据引用。
- **分工纪律：仿真管「手」，细问管「脑」。** 工步只做操作（排次序、挑工具、调参数、逐段推进），
  反馈只说三件事——发生了什么现象、指标掉了多少、规程怎么规定；**不讲机理、不讲为什么**，
  机理、推理、计算、设计全留给紧跟其后的细问。判据两条：一条反馈若把某道细问的评阅要点
  （rubrics.ts）说出来了，就是越界，改成只述现象；一个工步若本身就是某道细问的题干
  （曾经的「排 a–e 揭取次序」= 1-q1、「三代工具为何两全」= 2-q2、「按可信度排编号卡」= 3-q1），
  就换成另一个手上的动作（现为「建档」「送槽前核对」）。改 sim.ts 的文案前先对一遍同环节的细问。
- **不判分、不进评阅链路**：这一节不计入进度，环节完成仍以细问为准（`markCompleted`
  只看最后一道细问）。产出是一份操作记录，学习者可点「把这次操作记录带给小简」
  推进对话，prompt.ts 里写明了导师此时仍按先答后评追问、不代他复盘。
- 节序不写死：加节只要在 `content.ts` 的 `stageActTitles` 里加一项、在环节页的
  `ACT_ANCHOR` 里补一行锚点，环节页、GuideChat、guide-lines、`/api/chat` 的 act
  白名单都跟着走。

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

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
> **`public/wujian-intro.html`**（约 235KB，四标签页：应用全景 / 宣传文案 / 讲解逐字稿 / 技术路线）
> 是对外介绍项目用的纯静态单文件页——纸墨主题、vanilla JS 切换标签，无构建依赖，
> 直接以静态资源路径访问（`/wujian-intro.html`）；其内容由源码事实人工撰写，
> 项目结构大改时需同步更新（源分片在 /tmp，不持久化，直接改该文件即可）。
> 学情体系上线后已做增量增补：卷一加第十一/十二章（教师端三页签、演示数据、学生自视页）、
> 卷二加附五/附六（教师端与学生端文案）、卷三加第九幕（教师端演示讲稿）、
> 卷四原九/十/十一章顺延为十一/十二/十三章，新增第九章（学情链路：鉴权矩阵、
> 口令合并语义坑、overview 聚合取舍、词云算法四步流水线、learner-metrics 口径单一来源）
> 与第十章（RLS 静默挡数据复盘、双库架构与 seed 自助化、口令自愈副作用、E2E 纪律）；
> 同时修复了卷二附三/附四整块重复的历史 bug。新章锚点 id 用 `i-t1/i-t2/p-x1/p-x2/s-t/t-ls/t-dq`。
> 后又增补文物保护修复政策维度：卷一第十章新增 10.4「政策坐标」（新修订《文物保护法》
> 2024-11-08 通过/2025-03-01 施行、22 字方针入法；《"十四五"文物保护和科技创新规划》
> 与 2.6 万人才缺口；《文物修复师国家职业技能标准》2021 年人社部+国家文物局发布、
> 13 方向 65 等级、简牍归「出土(水)竹木漆器文物修复师」方向——均经 web 检索核实，
> 含走马楼「全国十大考古新发现/二十世纪中国百项考古大发现」地位表述）、卷二附五
> 加学生出路段、卷三演示预案加职业资格问答。
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

**教师首页即学情分析**：`/` 挂载时角色命中且 URL 无 `?view=student` →
replace('/teacher')。**会话权威**：跳转只认会话 `user.app_metadata.teacher`
（服务端标记，换设备也认）；本地 `wj-role==='teacher'` 只是加载前的提示——
会话加载完若不是教师（换账号/多标签页切过学生登录），本地标记判为过期
**当场清除且不跳转**，否则学生会被拽去 /teacher 撞权限墙；未登录且本地有
教师标记（会话过期）仍送去 /teacher 转登录。判定为教师时首页**不渲染展馆
内容直接空跳**（`teacherLeaving` 渲染闸门）——否则 `?tab=exhibition`
复原的简牍鉴赏会在教师刷新/重开应用时先闪现整页再跳走。
「学生视角」按 **挂载时快照**（`enteredAsStudent` ref）判定：Next 会把
history.replaceState 联动进路由，若按实时 searchParams 判定，清理 view 参数
的动作会反过来触发重定向、教师永远进不了学生视角。`/teacher` 顶栏「学生视角」
按钮 push('/?view=student') 供教师临时查看学生端（首页读参后 replaceState 清掉
参数，刷新即回教师端）。曾经用 sessionStorage 一次性标记（读取即焚）实现，
在二次挂载/受限 webview 下会把教师误弹回 /teacher，已废弃。登出
（AuthProvider.signOut）会同步清掉 `wj-role`，防止残留教师标记把游客浏览也拽去 /teacher。

**/teacher 权限墙可当场解锁**：非教师账号访问 /teacher 出现拦截卡时，
卡上直接提供口令输入框——提交走 overview 的 `x-teacher-passcode` 自愈链路
（服务端验口令 → 补写账号 `app_metadata.teacher` → 本机存
`wj-teacher-passcode` 供后续会话），验证通过直接进学情页，无需重登。
**自愈有副作用**：任何知道口令的账号都会被补写成教师——E2E 走这条通道
后测试账号必须显式还原（`updateUserById` 的 app_metadata 是**合并语义**，
删不掉已写入的 `teacher:true`，要还原就写 `teacher:false`，或 SQL
`raw_app_meta_data - 'teacher'`），否则测试学生会从学情列表消失、
下次登录还会被直接拽进教师端。

**首页「学情分析」入口对登录用户开放**（2026-09）：会话权威判定落地后，
学生会话不再被自动跳去 /teacher——教师若换了浏览器/当前挂着学生会话，
就没有任何路径进教师端（表现为「学情数据不见了」，实际是入口没了）。
入口按钮对**已登录用户**（教师/学生）渲染，游客（未登录）不显示——游客
无账号可鉴权。/teacher 自带权限墙 + 口令解锁守门，学生误点只会看到拦截卡。

**操作者账号 2237121364@qq.com 已是教师**（2026-09-26 直接 SQL 写入
`raw_app_meta_data.teacher`）：操作者浏览器长期挂着这个邮箱会话（非超星
OAuth 的王雨荷），没有教师标记时只能撞墙。补标记后**即时生效无需重登**——
overview 的 verifyUser 走 `supabase.auth.getUser(token)`，按 JWT 的 sub
从数据库取新鲜 app_metadata（E2E 已验证旧 token + 事后补标记 → 同一
token 立即 200）；首页自动跳转读的是浏览器 JWT 内嵌 claims，要等 token
刷新（≤1h）才生效，期间走「学情分析」按钮路径不受影响。

三层视图：班级卡片 → 班级学生表 → 学生学情详情（六环节 + 17 题逐题
判定/提交/草稿状态）。**班级由教师手动划分**（2026-09 改造，废弃了按
学工号前缀推导的旧方案）：归属存 `class_assignments` 表（user_id PK →
class_name），`GET /api/teacher/overview` 的 learners 每人带 `className`
（无归属 → 前端归「未编班」）；`POST /api/teacher/class-assign`
`{userId, className}`（className 传 null = 移出班级）由教师在学生行
右侧下拉操作，校验与 overview 一致（Bearer + app_metadata.teacher，
口令自愈兜底）。教师自建的空班级记在 localStorage
`wj-teacher-classes`（空班卡片保持可见，可删除）。数据走
`GET /api/teacher/overview`：service-role
读 auth.users 元数据 + workshop_progress 全表（画图题只回 imageKeys
不回 dataURL）。**教师账号（app_metadata.teacher=true）不进学情列表**——
教师自己不作为学习者出现，学生登录并产生进度后才有班级；无学工号且无
进度记录的账号同样不展示。listUsers 第一页就报错时返回 500「读取学生
名单失败」（如缺 service-role）——不能静默返回空列表，教师会误以为注入
的数据丢了。细问答完口径与进度条/完成判定共用 store 的 `isQuestionAnswered`。

**学情指标共享模块 `src/lib/workshop/learner-metrics.ts`（2026-09）**：
Learner 形状、TOTAL_STAGES/QUESTIONS、verdictOf/submittedOf/draftOf/
answerTextOf/verdictStats、fmtTime、鉴赏足迹 EXH_* 与计数函数——教师端
与学生自视页共用同一判定口径，别再在页面里复制这些函数（曾因此在
teacher/page.tsx 里维护过一份，已抽走）。

**学生端「我的学情」页 `/learner`（2026-09）**：登录学生从首页「学情分析」
按钮进入（教师仍进 /teacher，按 user.app_metadata.teacher 分流；游客无
按钮）。数据走 `GET /api/progress`（本人 Bearer），复用教师端
wj-tstage/wj-tbadge 视觉；判定三态徽章 `is-ver-ok`(竹青)/`is-ver-part`
(赭石)/`is-ver-bad`(朱砂)，题行下展示本人作答原文（wj-tq-ans，两行截断）。
无进度 → 空态卡引导回工坊。

**[/api/progress 必须带用户 JWT]（2026-09 修复的存量 bug）**：
workshop_progress 开了 RLS（policy `auth.uid() = user_id`）。该路由曾用
**不带用户 token 的 anon 客户端**读写——RLS 静默挡成空：登录学生的进度
保存/加载其实一直失败（库里只有 seed 走 service-role 写的行）。修复：
`userClient(token)` 把 Bearer 传进 Supabase 客户端 global headers，
RLS own-policy 生效。GET 同时透出 `updatedAt`。任何要按登录人读写的
表（RLS own-policy 模式）都走这个套路；service-role 仅教师端/seed 用。

**口令只在登录页出现一次，角色绑定账号（服务端）**：教师口令验过后
LoginForm 跳 `/api/auth/chaoxing?teacher=1&pw=<口令>`，发起路由服务端比对
`TEACHER_PASSCODE`（缺省 123）——验过才把 `teacher:true` 写进签名登录
上下文 Cookie（chaoxing-login-context），回调把它落成 Supabase 账号的
`app_metadata.teacher`（只升不降，后续登录自然保留）。/teacher **没有
口令门**：教师登录后任何路径直达学情数据；`GET /api/teacher/overview`
校验登录 Bearer + `app_metadata.teacher`，学生账号 403（页面显示「仅教师
可查看」），未登录 401 跳登录页。曾经用 sessionStorage/localStorage 存
口令的方案已废弃（OAuth 换标签页丢 sessionStorage、换设备/清缓存都要
重输）。`wj-role` localStorage 仍用于首页教师重定向。

**演示学情数据（2026-09）**：5 个班 × 10 人（学工号前缀 202501~202505 → 班级名
文保2401班/文保2402班/考古2401班/文保2301班/博物馆学2401班，写入
class_assignments；邮箱 `<学工号>@demo.invalid`），班级画像差异化：202501 标准梯度 /
202502 整体较好 / 202503 整体偏弱 / 202504 两极分化 / 202505 中段集中；进度从 6/6
全完成到未开始全覆盖，答案文本按报告事实逐题撰写（结构化题走
「选择：/多选：/排序：/匹配：」协议）。幂等可重跑。
清理：删 `@demo.invalid` 邮箱的 auth.users 账号及对应 workshop_progress /
class_assignments 行。

**⚠️ 沙箱与线上是两个独立 Supabase 库（2026-09-26 踩坑）**：`exec_sql` 的
develop 环境只作用于沙箱预览库；线上部署连 product 库（沙箱对 product 只读）。
本地脚本 seed 的数据**线上看不到**。因此演示数据已移植为线上可自助注入：
核心逻辑在 `src/lib/workshop/seed-demo.ts`（seedDemoData/clearDemoData，
admin 客户端并行执行），`scripts/seed-demo.mjs` 是调它的薄壳；线上入口是
`POST /api/teacher/seed-demo`（鉴权同 overview：Bearer + teacher）×
`{action:'seed'|'clear'}`，教师页头部「注入演示数据/清除演示数据」按钮直连。
注入幂等（账号 email 命中即复用，密码 123456），clear 只删 @demo.invalid
不影响真实学生。E2E 已验证全链路（清除→注入→幂等→403）。

**班级学情概览（2026-09）**：班级详情顶部有分析区（全部前端聚合，无新接口）——
六工序逐环节完成人数条形（verdictStats/activeWithin7d 辅助函数在 teacher 页内）；
细问判定质量堆叠条（成立/部分成立/不成立/已答未评，口径与学生详情逐题徽章一致，
verdict 值域「成立/部分成立/不成立」）；鉴赏人均板块/案例；近 7 天活跃人数。班级
卡片含判定优良率与鉴赏阅读率；学生详情头部有判定汇总 chips 与「未完成环节」提示。

**高频错误（2026-09）**：`errorRanking(list)`（teacher 页内）按题聚合判
「不成立/部分成立」的人数降序排出错题榜；`ErrorHotspots` 组件渲染。
教师端顶部有独立页签（`page` state：「班级」/「高频错误」，2026-09 从
班级页底部拆出）：高频错误页带班级筛选胶囊（全部班级 + 各班，`errClass`
state），显示完整排行；班级详情仍保留本班完整榜单（分析卡下方）。
每行点开看学生原答（`answerTextOf` 拼接各小问文字，画图题标注「画图作答」）；
错误率 ≥50% 的题 `is-hot` 朱砂描边。判定口径与逐题徽章一致（每题取首个判据键）。

**热点词云（2026-09）**：教师端第三个页签「热点词云」（`CloudPage` + `buildWordCloud`，
纯前端聚合，无后端改动）。`tokenizeAnswer` 用 `Intl.Segmenter('zh-CN')` 分词
（不支持时退化为中文串二元组），`CLOUD_STOP` 停用词表滤虚词/格式词（说明、选择、的是等，
2026-09-26 又按真实数据全量 dump 证据扩了一轮：针对/都是/保持/处的/分钟/罗马数字 III IV 等
泛用词与分词残片）；`validCloudWord` 另有两条通用规则——尾字为虚词（的/了/是/在/和/与/或）
的词判为分词残片直接拒绝、`^[ivxlc]+$` 判为罗马数字拒绝；每位学生对每词只计一次。排序分数 = 提到人数 × √出现的题目数——直接按人数排会被
单题模板长答案（如排序题约束文本）刷平顶层，加权后跨题复现的领域术语（简体、纤维、
脱色）才浮上来。字号/颜色按 score 对数插值（14–38px，朱砂/墨/铜三档），
排行前 20 显示「N 人 · M 题」。班级筛选胶囊与高频错误页同款（`cloudClass` state）。

**卡片视觉统一（2026-09）**：根因是 `--wj-paper` 曾在 14 处引用但从未定义
（班级卡透底、朱砂底文字继承深色）。已在 :root 定义 `--wj-paper: #fbf6ec`。
教师端卡片语言统一为：纸白底 + `--wj-border` 1px + 12px 圆角 +
`0 1px 6px rgba(93,64,28,.05)` 静态阴影（`.wj-tcard` / `.wj-an-card` 一致）；
tcard 悬停只做朱砂描边+轻阴影，无位移。空班级卡（`list.length===0`）
指标显示「—」而非 NaN（`empty` 守卫），进班后有引导提示。

**鉴赏篇阅读足迹（2026-09）**：鉴赏板块是纯陈列阅读（无题无进度），
学情以「足迹」呈现——store 的 `exhibitsViewed`（板块 id
discovery/forms/themes/cases/reference + 案例 `case-1…5` → 最近访问
ISO 时间），五个板块页与案例页挂 `<ExhibitVisit id>` 上报（挂载即
visitExhibit），随 useProgressSync 同步入 workshop_progress。教师端
学生表有「鉴赏」列（板块 n/5 · 例 n），学生详情有「简牍鉴赏 · 阅读足迹」
区块（十个条目逐个显示已读/未读+时间）。seed 脚本的画像含 exhB/exhC
（板块/案例数，按板块顺序推进）。

## 常见问题与预防

**dev server 长跑后编译停更（2026-09-26 实录）**：`pnpm tsx watch
src/server.ts` 跑了约 1.5h 后 webpack/postcss watcher 停止响应源码改动
（请求也不触发重编，`.next/dev/static` 产物 mtime 停在旧时间；表现是
改了 CSS/TSX 但 curl 出来的产物不变）。touch 无效；kill 后原样重启仍
吃 `.next` 旧缓存。**有效解法：`rm -rf .next` 后重启 dev.sh**。排查口诀：
改完代码先用 curl 验证编译产物（CSS chunk / 客户端 JS 里 grep 新类名/
新文案），对不上先怀疑缓存僵死，别急着改代码。

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

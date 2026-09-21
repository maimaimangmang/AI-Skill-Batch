# 验收记录与复测步骤

## 市场模型说明与分页（2026-09-20）

- 后续页码更新：先收集完整市场列表再按 12 项切页，显示前 3 页、后 3 页、中间当前页及省略号；总页数依据实际去重记录数计算。取消旧搜索时中止读取，重复游标会报错，不显示未读完的总页数。
- 23 项测试、类型检查和生产构建通过；独立检查覆盖 12 页布局、中间页、小于 7 页、跨页去重、重复游标和中止请求。本地真实市场显示 226 项 / 19 页，已直接从第一页跳到第 19 页，末页 10 项且下一页禁用。

- 市场卡片新增模型说明；仅提取公开介绍中明确的模型声明，无声明则显示“模型未公开”。模型名称旁标注“作者说明”。
- 每页 12 项，提供上一页、下一页及已获取游标对应的页码；翻页替换当前列表。搜索、清除搜索和刷新重置第一页。
- TypeScript、23 项现有测试及生产构建通过。额外冒烟检查覆盖模型声明提取、无声明降级、26 项演示数据的 12/12/2 分页和搜索。
- 本地浏览器使用已连接会话，只读验证真实市场第一、第二页切换和返回；第二页搜索“电商带货视频”后显示第一页的一项结果，前后翻页均禁用；卡片与分页布局已截图检查。未提交付费任务。

## 自动化

运行 `npm run typecheck`、`npm test`、`npm run build`。

2026-09-20：首版 TypeScript 与生产构建通过；原有 17 项自动化测试通过。修复登录后，TypeScript、生产构建与全部 23 项测试均通过。新增 6 项来源校验回归测试，覆盖 Next.js 将 127.0.0.1 规范化为 localhost 的情况、本地端口与主机边界、跨站拦截、显式配置及生产环境缺少配置的拒绝。测试完全模拟上游，不创建真实订单。

覆盖：

- 匿名访问与跨站提交被拒绝；无效 Key 不创建会话。
- 密钥加密、密文篡改检测、退出使旧 cookie 失效。
- 1–10 行边界、必填、类型转换、默认值和未知字段过滤。
- 票据跨会话不可使用，客户端不能替换已确认输入。
- 报价不足以授权执行；缺失币种、报价过期和费用变化阻止执行。
- 上游已下单但响应丢失，重试保持相同请求内容和幂等键；结果返回后不会再下单。
- CSV 多行引号、单列 CSV、超过十行保留选择，XLSX 多工作表、文本公式与异常 ZIP 拒绝。

## 浏览器复测

1. 打开首页，点击「先体验演示」，确认顶部持续显示演示提示。
2. 选择产品文案工作流，空表直接预估：应提示至少填写一行；只填一行时，不应要求其余空行填写。
3. 填入示例，复制到十二行：应可继续新增、复制与删除，不限制十行。
4. 预估费用：十二个产品文案演示任务显示调用费 2.4 元、模型费 0.6 元、预计预占 3 元。
5. 确认演示执行：应出现十二行示例结果，全部带有“非 AI 实际生成”提示。
6. 返回我的任务：应看到刚才的十行任务。
7. 新建任务，导入 `tests/fixtures/import-12-rows.csv`：应保留十二行，初始不自动选择；选前十行后才能导入，剩余两行不能继续勾选。
8. 查看输入表格、修改字段、重新预估。
9. 下载结果 Excel，打开检查表头、中文、十行输入与结果。内置浏览器下载事件未返回，文件落盘尚未验证，需在系统浏览器复测。
10. 小屏幕检查导航菜单，表格应在自身容器中横向滚动；弹窗可以关闭，按钮可键盘操作。

已在浏览器验证步骤 1–6，以及步骤 7 的十二行解析、自动字段匹配与初始不选行。后续选行操作受自动审批超时阻止，步骤 7 的最终导入和步骤 8–10 尚未完成浏览器验收。

真实工作流验收需用户通过网页接入自己的 Key，先选择一行低成本任务并确认费用，再检查市场加载、附件上传、实际结果和 Excel 下载。尚未使用真实 Key 执行付费任务。

## Railway 部署验收（2026-09-20）

- 本地 23 项测试与类型检查再次通过。
- 修复 Railway 构建器不支持 Dockerfile `VOLUME` 指令的问题；数据卷由平台挂载到 `/data`，Docker Compose 也保留显式卷配置。
- Railway 生产镜像构建成功，部署状态为 SUCCESS，运行日志确认挂载持久卷并启动容器。
- 公网 HTTPS：首页 200；会话查询 200 且未连接；匿名市场请求 401；同源空 Key 请求 400；跨站登录请求 403。
- 用明确无效的测试 Key 访问登录接口，返回上游 Key 无效的 401，确认服务器可连接胜算云鉴权服务。未使用真实 Key，未创建付费任务。
- 打开公网网页的自动浏览器工具超时，未完成线上浏览器交互验收。真实登录、任务和下载需另外验证。

本地尚无 Docker 环境；容器构建及启动验证在 Railway 完成。

## 结果标题与卡片展示（2026-09-20）

- 增加带名称的结果卡片、图片网格、媒体类型标签和明确的查看链接；长文本默认折叠。
- 使用结果中明确提供的步骤名称，或同一任务中通过步骤 ID 对应的名称；明确输出名称次之。通用 `output` 等字段以“生成图片 1”等类型编号替代，不按图片位置猜测用途。
- 类型检查和生产构建通过；用示例数据核对了步骤名对应、缺失名称、分类型编号和“查看原图”链接文案。未提交真实付费任务。

## 导航精简与浅色侧边栏（2026-09-21）

- 删除桌面顶部面包屑和口号、侧边栏工作空间卡片及市场标题旁的装饰图标；引导文案改为“用 Excel 表格批量调用 Skill”。
- 侧边栏改为白底、浅蓝选中态，余额和账号区同步使用浅色；移动端保留菜单入口及关闭按钮。
- 类型检查、生产构建通过；本地会话过期后在演示模式截图检查桌面布局，未提交付费任务。

## 输入输出示例预览（2026-09-21，本地）

- 编辑页增加输入/输出对照，可切换公开 sample_rows、填入单组示例，覆盖已有输入前确认。
- 产品文案演示页使用明确标注“非真实试跑结果”的手写效果示意；真实工作流仅展示已公开输入，未取得输出示例时显示缺失说明。
- 移除无操作的“批量任务”标签；Agent 专属链接复制仍待确认官方链接格式，尚未接入。
- 类型检查和生产构建通过，演示页布局经浏览器截图核对。尚未同步线上。

## Agent 安装提示词（2026-09-21，本地）

- 依据用户提供的官方详情页核对服务端渲染内容，安装提示词使用 api.shengsuanyun.com 的 /loom/v1/marketListings/{id}/skillPackage/archive。
- 编辑页增加“复制安装提示词”，复制成功显示反馈，剪贴板权限失败时提供可手动选择的文本；演示 Skill 禁用安装并显示原因。
- 提示词与官方示例逐字比对通过；演示 ID 和非法 ID 不生成链接。类型检查和生产构建通过，浏览器确认演示禁用态。真实账号下剪贴板交互尚未验收，尚未同步线上。

## 按填写行数提交、取消十行批次限制（2026-09-21，本地）

- 前后端共用空行判断，仅填写过的公开字段激活任务；默认值在有效行归一化时补上。部分填写行保留必填校验及原始行号，0 和 false 不视为空。
- 取消新增、复制、粘贴、导入选择、失败行重填、报价和执行的 10 行限制。文件导入仍保留原有 5 MB、2000 行/100 列解析容量，接口请求大小限制保留。
- 25 项测试、类型检查和生产构建通过；测试包含 1000 行归一化，单行加空行报价与执行、12 行完整报价与执行、全空表、默认值及无效行。所有执行测试使用模拟上游，未创建付费任务。

## 2026-09-21 任务结果卡片（本地）
- 将横向结果表替换为每条任务一张卡片：顶部序号与状态，上方输入、下方输出；Excel 下载仍保持表格格式。
- 输入名称使用市场 schema 的字段标签，市场不可用时保留原字段名；长输入可展开。
- 图片保留缩略图和原图链接，长文本显示预览并可展开，超过 4 项输出可查看全部；错误详情默认折叠，已生成产物仍显示。
- 本地演示结果浏览器检查：单任务卡片、中文输入标签、状态、文本输出正常显示。未调用真实 AI。
- `npm run typecheck`、25 项现有测试、生产构建通过。本次未部署。

## 2026-09-21 登录页独立品牌与电商定位（本地）
- 主标题改为“电商批量生图，从一张表开始”，说明 Skill 批量调用、图片和文案用途；未使用未经测试的“100 张与 1 张同耗时”承诺。
- 胜算云保留为 API Key、多模型调用和结算服务提供方，页脚明确独立开发、非官方产品；同步页面描述及工作台页脚。
- 注册入口改为用户指定的 https://www.shengsuanyun.com/?from=Zoey，按用户提供的活动说明展示 10 元体验额度。
- 类型检查通过；浏览器核对登录页文案、链接目标和 1034px 宽度布局，无需登录或调用 AI。本次未部署。

## 2026-09-21 作者区域与固定推荐（本地）
- 侧栏新增“找作者吐槽 / 加入 AI 电商交流群”区域。尚未收到作者二维码，明确显示待添加；`lib/community.ts` 配置实际图片后可点击放大。
- 新增“免费上架 / 我的自定义工作流”，指向用户指定的 https://www.shengsuanyun.com/zh/loomloom。
- 金牌推荐固定为 Angel 亚马逊套图、通用文生图、通用文本生成、电商带货视频；Angel 增加火焰与“火热”徽标。
- 从公开市场 HTML 核对两条 listing ID 与两条官方模板 URL。真实账号下市场工作流沿用站内填写流程；两个官方模板跳转真实模板页，未把模板 ID 当作 listing ID。
- 演示模式展示相同真实推荐，按钮仅打开介绍页，不映射成无关的演示工作流。
- 类型检查、生产构建通过。浏览器核对推荐名称、徽标、链接和侧栏布局；未进行真实付费执行，未部署。

## 2026-09-21 市场首页风格预览（本地）
- 新增独立的 `app/studio-market.css`，仅在市场视图通过 `studio-market` 类启用：鼠尾草绿导航、暖灰主背景、深墨绿操作与香槟色推荐区。
- 调整标题、价格和操作的层次，保留紧凑卡片、作者、小模型标签、真实价格说明、二维码横排等已确认设计。
- 工作流图标按公开名称中的图片、视频、翻译、审核等关键词选择，仅为视觉提示，不推断模型或隐藏步骤。
- 浏览器检查桌面实际预览；类型检查和生产构建通过。细调了低对比度的小字颜色。
- 该方向尚未应用到登录页和任务填写/结果页，未部署。样式独立，便于继续调整。


## 2026-09-21 Studio visual refresh (local)
- Unified market, editor, results, settings and login using cobalt, ice blue and a lemon-yellow featured accent. Replaced the previous muted palette and duplicate theme overrides.
- Four category covers distinguish commerce, image, text and video. These are category graphics, not claimed workflow output samples. Authors, prices, models, links and compact cards remain intact.
- Refined tables, quote actions, status labels and input/output cards. Kept horizontal QR layout and mobile table scrolling.
- Typecheck, all 25 existing tests and production build passed. Browser checked at the current 736px viewport: market, mobile navigation, editor, quote dialog, results and login. Completed one demo-only task; no real AI calls or charges.
- Local preview only; not deployed.


## 2026-09-21 Horizon reference refinement (local)
- Followed the user-provided Horizon screenshot: white navigation, pale canvas, white rounded cards, indigo headings and a single violet accent family. Removed yellow/teal/orange category palettes.
- Replaced 70-82px featured covers with 28px icon/category rows. Removed the outer colored recommendation panel and put price/action beside each other when space permits. Kept authors, pricing and icon-only hot indication.
- Navigation selection uses a violet icon and a slim edge marker; compact model tags and horizontal community QR retained. Brand icon updated to the same palette.
- Typecheck passed. Browser inspected the actual market and mobile navigation; recommendation text, prices and links remained visible. No real tasks executed; not deployed.


## 当前发布验收（2026-09-21）

以下记录覆盖上方历史迭代中已被替换的设计和行为：

- 当前为白色侧栏、浅色画布和紫色强调色；金牌推荐为独立白色区域，四项按列分隔，标题无图标。
- 官方文本和文生图模板使用专用校验、预估和执行接口，站内完成填写与结果展示。
- 真实服务可能省略价格版本号；执行前仍重查金额，价格变化要求重新确认。
- 任务列表与结果标题过滤编号占位；删除结果卡片的“工作流未提供具体名称”提示。
- 余额说明中的“胜算云”高亮并链接到作者渠道。
- 31 项模拟测试和生产构建通过；演示文本任务流程跑通。真实模板字段已读取验证，未提交真实付费生成任务。真实预估复测因余额变化提示而停止，不能视作完整付费链路验收。
- 全部网站更新已发布至 Railway，公网首页、健康接口及最新静态资源检查通过。

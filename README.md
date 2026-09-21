# LoomDesk

一个独立、可自部署的 LoomLoom 批处理工作台。选择市场工作流，上传或在线填写表格，一行一个任务，结果整齐归表。

**当前版本：0.1.0 · MIT · Node.js 24+**

[在线体验](https://loomdesk-production.up.railway.app/) · [免登录演示](https://loomdesk-production.up.railway.app/?demo=1)

LoomDesk 独立开发，非胜算云官方产品。由胜算云提供多模型调用和结算服务。

## 已实现

- 固定金牌推荐、作者展示、紧凑的工作流卡片，以及按类型排列的逐行结果卡片。
- 通用文生图和通用文本生成可直接在站内填写、预估、确认和运行，使用官方模板专用接口。
- 使用用户自己的胜算云 API Key 接入，每个会话独立，不共享平台 Key。
- 工作流市场：搜索、每页 12 项的按钮分页、详情、输入说明、调用费展示。
- 页码展示前 3 页、后 3 页和中间的当前页，间隔以省略号表示；完整读取当前搜索的市场列表后计算总页数，支持直接跳到末页。
- 市场卡片展示作者在公开介绍中明确声明的模型；未提供时显示“模型未公开”，不根据名称或生成效果猜测。
- 按公开输入 schema 生成任务表：必填项、默认值、枚举、数字、布尔值、附件。
- 按实际填写行数提交，忽略空白行，不设 10 行批次上限；支持新增、复制、删除行，从 Excel 复制多列粘贴。
- 导入 `.xlsx`、UTF-8 `.csv` 和 `.tsv`，选择工作表、字段映射、选择要提交的数据行；默认全选数据行，不自动截断。
- 下载官方输入模板；上传附件并引用返回的资产 ID。
- 先校验，再预估费用，用户明确确认后执行。
- 服务端重新核对报价；提交超时保留同一个幂等键，可恢复未确认结果的提交。
- 任务历史、8 秒间隔轮询、逐行结果、错误信息、失败行重新填写、结果 Excel 下载。
- 图片、音频、视频产物预览，其他产物使用 HTTPS 链接打开。
- 结果以带标题的卡片网格展示，优先使用可用步骤名称或明确输出名称；缺少名称时按类型编号，不根据图片顺序猜用途。长文本可折叠，图片链接明确显示“查看原图”。
- 明确标注的演示模式：无需 Key，不访问真实工作流、不产生费用。

## 本地运行

```bash
npm ci
npm run setup
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。可以先选择「先体验演示」，或在登录页输入自己的胜算云 API Key。

`npm run setup` 生成随机会话加密密钥并写入 `.env.local`，不会覆盖已有文件。API Key 通过网页输入，不需要写入项目环境文件。不要将 `.env.local`、`.data` 或真实输入结果上传到 GitHub。

如果更换端口或访问主机，请同步修改 `APP_ORIGIN`。例如使用 `http://127.0.0.1:3410` 时，设置 `APP_ORIGIN=http://127.0.0.1:3410`，再运行 `npm run dev -- --port 3410`。

## Docker 自部署

没有服务器或域名时，可使用 [Railway 部署指南](docs/RAILWAY.md)，由平台提供 HTTPS 网址。

```bash
node scripts/setup.mjs
docker compose up -d --build
```

默认仅监听本机 `127.0.0.1:3000`。公开部署时，在前面配置 HTTPS 反向代理，并修改 `.env.local`：

```dotenv
APP_ORIGIN=https://your-domain.example
COOKIE_SECURE=true
```

保留自动生成的 `SESSION_ENCRYPTION_KEY`，然后重建容器。反向代理需保留正确的 Host，允许最大 15 MB 请求体，并将上游请求超时设为至少 60 秒。应用在服务端独立限制表格为 5 MB、单个附件为 10 MB。

`loomdesk-data` 卷保存 SQLite 会话和执行确认记录。当前适合单实例部署；横向扩容前，需要把会话、报价和限流存储迁移至共享服务。请勿将多个实例各自独立的 SQLite 数据库作为同一站点运行。

## 配置

| 变量 | 用途 |
| --- | --- |
| `SESSION_ENCRYPTION_KEY` | 64 位十六进制字符串，AES-256-GCM 密钥。生产环境必填。轮换后已有会话失效。 |
| `APP_ORIGIN` | 浏览器访问站点的完整来源，包含协议和端口。生产环境必填，用于防止跨站提交。本地未配置时按实际 Host 校验，仅支持 localhost、127.0.0.1、[::1]。 |
| `COOKIE_SECURE` | HTTPS 部署设为 `true`；仅本地 HTTP 开发设为 `false`。 |
| `DATA_DIR` | SQLite 和本地开发密钥目录；Docker 默认 `/data`。 |
| `LOOMLOOM_BASE_URL` | 默认 `https://loomloom.shengsuanyun.com`；仅运维可配置，必须 HTTPS，前端不能更改。 |

未运行 setup 时，本地开发会在 `.data/development.key` 生成开发密钥；生产环境不会这样降级。不要在公开部署中设置测试变量 `LOOMDESK_TEST_MODE`。

## 工作流程

1. 在市场选择工作流，查看填写说明与输入字段。
2. 在线填写，或上传表格并确认字段对应关系。空白行自动忽略，填写了一部分的行仍检查必填项。
3. 点击「校验并预估费用」，查看任务数、调用费、模型费、总预占金额和余额。
4. 确认后提交。任务会在 LoomLoom 云端继续运行，不依赖网页保持打开。
5. 在「我的任务」查看结果并下载 Excel。失败行可重新填写，再预估和确认。

输入或工作流变化后必须重新报价。报价有效期 5 分钟；确认时会再次检查上游报价，变化则要求重新确认。LoomLoom 最终在创建订单时选择可售版本和价格，重新报价检查不能消除上游报价与下单之间极短的并发变更窗口。

若提交时网络异常，请用「重试同一提交」或页面上的「恢复提交」，不要另开一批相同任务。服务器保留原始输入及幂等键；会话有效期内，即使刷新页面或重启应用，仍能恢复。退出连接会删除当前会话及对应确认记录，退出前请核对未确认结果的提交。

## 数据与安全

- Key 用 AES-256-GCM 加密后存入服务端 SQLite；浏览器只持有 HttpOnly、SameSite=Strict 的随机会话 Cookie，生产环境使用 Secure。
- 会话最长 12 小时，退出立即删除。过期数据会在后续登录清理。
- Key 只发送给运维配置的 LoomLoom HTTPS 地址，禁止自动跟随重定向。
- 所有市场、任务、下载、附件和执行请求使用当前会话 Key。上游负责账号资源权限，客户端不共享任务缓存。
- 报价票据绑定当前会话，客户端不能用另一个账号的票据执行，也不能修改已确认输入。
- 限制请求大小与频率，检查表格 ZIP 解压体积；解析 Excel 不执行公式。日志不记录 Key、输入内容或完整上游响应。
- 产物链接为短期链接，过期后刷新结果页重新获取；不把链接当作永久存储。
- 自部署运营者控制服务端，因此用户应只向可信部署输入 API Key。

## 开发与检查

```bash
npm run typecheck
npm test
npm run build
```

测试使用模拟上游，不访问真实付费执行接口。覆盖会话隔离、加密、CSRF、行数和字段校验、报价失效、价格变更、输入防篡改、幂等重试及 CSV/XLSX 解析。浏览器验收步骤见 [docs/QA.md](docs/QA.md)。

```text
app/                 Next.js 页面与受限服务端 API
components/          市场、表格、导入、结果与确认弹窗
lib/domain.ts        schema、输入校验、金额与状态
lib/server.ts        加密会话、报价存储、上游请求
lib/workbook.ts      文件大小、ZIP 边界、表格解析
lib/demo.ts          独立演示数据与模拟执行
tests/               接口与表格测试，示例 CSV
```

## 第一版边界

- 当前登录方式是 API Key 接入，不含独立注册、找回密码或胜算云 SSO。
- 支持市场工作流，以及通用文生图、通用文本生成两个官方模板；不含私有模板管理、创建与上架、团队共享任务。
- 任务表草稿保存在当前页面内存中，刷新前请先保留原表格；云端已提交任务不受影响。
- 演示数据仅在当前页面内存中，刷新后演示历史重置。
- 支持任意有效 Key 用户接入，但大规模公开运营需要根据流量调整限流、共享存储及代理配置。
- 已完成模拟接口测试、部分浏览器流程及 Railway 容器部署和公网接口冒烟检查；真实 Key、真实付费工作流和完整浏览器流程仍需联调验收，详情见验收记录。

## 自定义品牌与推荐

- `lib/featured.ts`：首页固定推荐、作者与公开参考价格；真实执行前以服务端预估为准。
- `lib/community.ts` 与 `public/author-qr.jpg`：作者联系二维码，自部署时可替换为自己的图片。
- `components/workbench.tsx`：登录页和余额区的渠道链接，当前为作者的 `?from=Zoey` 链接。体验额度为第三方活动，以实际领取条件为准。
- `app/studio-market.css`：主要视觉主题；`app/globals.css`：基础组件样式。

## 参考来源与许可证

接口依据：[LoomLoom 开发者指南](https://lean.shengsuanyun.com/apidocs/loomloom/guide/loomloom-guide)、[官方 OpenAPI 总览](https://lean.shengsuanyun.com/apidocs/loomloom/api)。

评估过用户提供的 [loom_web](https://gitee.com/sunny-cx/loom_web)，该仓库未提供明确许可证，且技术栈与账号模型不同，因此本项目未复制其源码。评估记录见 [docs/REFERENCE-REVIEW.md](docs/REFERENCE-REVIEW.md)。

LoomDesk 原创代码按 [MIT](LICENSE) 发布，第三方依赖遵循各自许可证。本项目是独立客户端，不代表 LoomLoom 或胜算云官方产品。

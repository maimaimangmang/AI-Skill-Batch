# 自部署与开发

[返回项目介绍](../README.md)

这里保留部署配置、费用确认和数据处理的说明。首次在本地运行可先按 README 的步骤操作。

## Docker 自部署

没有服务器或域名时，可使用 [Railway 部署指南](RAILWAY.md)，由平台提供 HTTPS 网址。

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

测试使用模拟上游，不访问真实付费执行接口。覆盖会话隔离、加密、CSRF、行数和字段校验、报价失效、价格变更、输入防篡改、幂等重试及 CSV/XLSX 解析。浏览器验收步骤见 [docs/QA.md](QA.md)。

```text
app/                 Next.js 页面与受限服务端 API
components/          市场、表格、导入、结果与确认弹窗
lib/domain.ts        schema、输入校验、金额与状态
lib/server.ts        加密会话、报价存储、上游请求
lib/workbook.ts      文件大小、ZIP 边界、表格解析
lib/demo.ts          独立演示数据与模拟执行
tests/               接口与表格测试，示例 CSV
```

## 自定义品牌与推荐

- `lib/featured.ts`：首页固定推荐、作者与公开参考价格；真实执行前以服务端预估为准。
- `lib/community.ts` 与 `public/author-qr.jpg`：作者联系二维码，自部署时可替换为自己的图片。
- `components/workbench.tsx`：登录页和余额区的渠道链接，当前为作者的 `?from=Zoey` 链接。体验额度为第三方活动，以实际领取条件为准。
- `public/loomdesk-mark.svg` 与 `public/loomdesk-mark-light.svg`：浅色和深色背景下的品牌标志。
- `app/studio-market.css`：主要视觉主题；`app/globals.css`：基础组件样式。

## 接口与参考

项目接入 [LoomLoom API](https://lean.shengsuanyun.com/apidocs/loomloom/api)。早期参考项目的评估记录见 [REFERENCE-REVIEW.md](REFERENCE-REVIEW.md)。

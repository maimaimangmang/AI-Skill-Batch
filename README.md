# LoomSkill

**用表格批量运行 AI Skill，生成商品图、插画和文案。**

选择一个 Skill，在线填表或导入 Excel / CSV，每行就是一个任务。确认费用后批量提交，在「我的任务」集中查看进度、获取结果。

[在线体验](https://loomskill.com/) · [探索 Skill](https://loomskill.com/skills) · [批量生图场景](https://loomskill.com/batch-image-generation) · [自行部署](docs/SELF-HOSTING.md) · [反馈问题](https://github.com/maimaimangmang/AI-Skill-Batch/issues)

<!-- 截图待补：批量任务表。使用示例商品和几行已填写任务，裁掉浏览器边框及账号信息。 -->

## 可以做什么

- **批量生图**：按行填写提示词，或提供参考图、商品图和画面要求，生成插画、商品场景图、电商套图等素材。
- **批量写文案**：把商品信息、卖点或选题填入表格，调用对应 Skill 生成内容。
- **导入已有表格**：支持 Excel、CSV、TSV，也可以从 Excel 复制多行粘贴；导入时选择行、列并对应输入字段。
- **集中管理任务与结果**：查看执行进度，预览图片、视频、音频和文本，导出结果为 Excel；失败任务可以修改输入后重新提交。
- **收藏常用 Skill**：连接 API Key 后收藏，方便下次找到并继续使用。

每个 Skill 的输入要求和输出形式不同，以详情页的说明为准。

## 从一张表到一批图片

例如，你要给一批商品制作场景图：

1. 选择适合的商品图 Skill，先查看输入要求和结果示例。
2. 每行填写一个商品的图片、信息和画面要求，或导入准备好的表格。
3. 校验输入、预估费用，确认后批量提交。
4. 到「我的任务」查看生成结果，下载所需素材或导出结果表格。

任务提交后在云端继续执行，无需一直开着网页等待。

<!-- 截图待补：与上方任务表对应的真实生成结果，展示多张商品图。 -->

## 快速上手

1. 打开 [loomskill.com](https://loomskill.com/)，从「探索 Skill」选择一个场景。
2. 查看填写说明，在网页中填写任务表，或下载模板、填写后导入。浏览和填写无需连接 Key。
3. 点击「校验并预估费用」，按提示连接自己的胜算云 API Key，核对任务数量和预计费用。
4. 确认执行后，到「我的任务」查看进度和结果。

**尚未提交的表格草稿只保存在当前页面，关闭或刷新前请另存。**

<!-- 截图待补：Skill 列表，展示生图与文案等不同场景。 -->

## 在本地运行

需要 Node.js 24 或更新版本。

```bash
git clone https://github.com/maimaimangmang/AI-Skill-Batch.git
cd AI-Skill-Batch
npm ci
npm run setup
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，即可浏览 Skill，或连接自己的 Key 使用任务功能。

`npm run setup` 会生成本地配置，不覆盖已有的 `.env.local`。API Key 在网页里输入，无需写进代码或配置文件。使用其他端口时，将 `.env.local` 中的 `APP_ORIGIN` 改为实际访问地址。

Docker 部署、环境变量和存储配置见 [自部署与开发](docs/SELF-HOSTING.md)，Railway 部署见 [Railway 部署指南](docs/RAILWAY.md)。

## 服务依赖与费用

### LoomSkill 与 LoomLoom 的关系

LoomSkill 是接入胜算云 **LoomLoom** 服务的独立开源工作台：任务表填写、批量提交和结果查看在这里完成，Skill 执行由 LoomLoom 云端服务提供。自行部署工作台后，运行真实任务仍需连接该服务，并提供自己的胜算云 API Key。

本仓库开源的是网页工作台；市场中各个 Skill 的内部提示词与工作流编排不包含在仓库内。调用者可以查看公开的输入说明、价格、任务状态和返回结果。

### 使用是否收费

浏览 Skill 和填写任务表不会执行任务。连接 Key、预估费用并确认后，才会提交执行。真实任务可能产生 Skill 调用费和模型费用，以页面预估及胜算云最终结算为准。

### Key 与数据如何保存

API Key 加密保存在部署服务器的会话中，不写入浏览器本地存储；会话最长有效 12 小时，退出连接后删除。请只在可信的部署中输入 Key。

不要将 `.env.local`、`.data`、API Key 或真实任务数据提交到仓库。当前使用 SQLite，按单实例部署；存储与数据处理细节见 [自部署与开发](docs/SELF-HOSTING.md)。

## 上传自己的 Skill

如果你有自己的 Skill，可以通过导航中的「上传 Skill」前往 [LoomLoom 平台](https://www.shengsuanyun.com/zh/loomloom/)，按平台要求适配工作流、填写输入输出说明、测试并提交上架。

上传、定价、审核和收益管理在 LoomLoom 平台完成，具体规则以平台说明为准。本项目提供调用工作台和上传入口，暂不提供站内私有 Skill 编辑器或团队协作。

## 开发与贡献

技术栈：Next.js · React · TypeScript · SQLite。

```bash
npm run typecheck
npm test
npm run build
```

测试使用模拟接口，不会提交真实付费任务。开发与配置说明见 [自部署与开发](docs/SELF-HOSTING.md)，浏览器检查步骤见 [QA 文档](docs/QA.md)。

欢迎通过 [Issue](https://github.com/maimaimangmang/AI-Skill-Batch/issues) 反馈问题或提出建议，也欢迎提交 Pull Request。报告问题时，请附上操作步骤、预期结果和实际表现；截图与日志中请去除 API Key 和私人任务数据。

## 许可证

[MIT](LICENSE)。可以修改和自行部署，保留许可证中的版权声明。第三方依赖遵循各自许可证。

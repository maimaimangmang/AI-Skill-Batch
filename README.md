# AI Skill Batch

![LoomDesk](docs/brand/loomdesk-logo-preview.png)

**用一张表，批量运行 AI Skill。**

选好 Skill，把要处理的内容填进表格，一行一个任务。提交后，可以在同一个页面看进度、预览图片和视频，再把结果导出为 Excel。

比如，你有 30 个商品需要做白底图：选一个商品图 Skill，填好每个商品的信息和参考图，确认费用后一起提交。不用逐个填写、逐个等待，再去翻聊天记录找结果。

[在线使用](https://loomdesk-production.up.railway.app/) · [先看演示，无需 Key](https://loomdesk-production.up.railway.app/?demo=1) · [部署到自己的服务器](docs/SELF-HOSTING.md)

网页里的名字是 **LoomDesk**。项目接入胜算云 LoomLoom，运行真实任务需要你自己的胜算云 API Key，费用由胜算云结算。LoomDesk 是独立开源项目，非官方产品。

## 可以拿来做什么

- **批量做商品图**：上传参考图，填写商品信息，调用商品白底图、电商套图等 Skill。
- **批量写内容**：把商品卖点、选题或提示词按行填好，生成文案，也可以直接用通用文本生成和文生图。
- **接着用已有的表格**：导入 Excel、CSV、TSV，或从 Excel 复制多行粘贴。导入时可以选列、选行。
- **集中收结果**：按任务查看图片、视频、音频和文本。失败的行可以修改后重新提交，结果可以导出为 Excel。

可用的 Skill 以市场为准。每个 Skill 需要什么输入、会生成什么内容，要看它的填写说明。

## 怎么用

1. 打开网站，输入胜算云 API Key。只想看看界面，可以先进入演示模式。
2. 在工作流市场选一个 Skill，下载它的模板，或在网页里填任务表。
3. 点击「校验并预估费用」，核对任务数量和预计费用，再确认执行。
4. 到「我的任务」看进度和结果。可以按名称、编号、状态或提交时间查找。

提交后的任务在云端运行，关掉网页也会继续。**尚未提交的表格草稿只保存在当前页面，刷新前记得另存。**

## 在本地运行

需要 Node.js 24 或更新版本。

```bash
git clone https://github.com/maimaimangmang/AI-Skill-Batch.git
cd AI-Skill-Batch
npm ci
npm run setup
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，就可以进入演示或连接自己的 Key。

`npm run setup` 会生成本地配置，不覆盖已有的 `.env.local`。API Key 在网页里输入，不用写进代码或配置文件。请不要把 `.env.local`、`.data` 和真实任务数据提交到仓库。

使用其他端口时，要把 `.env.local` 中的 `APP_ORIGIN` 改为实际访问地址。

## 使用前了解这几件事

- 演示模式使用示例数据，不调用真实模型，也不产生费用。
- 开源的是这个工作台。真实任务的 Skill 调用费和模型费用以页面预估及胜算云最终结算为准。
- Key 加密保存在部署服务器上，会话最长保留 12 小时，退出连接后删除。请在你信任的网站使用 Key，也可以自行部署。
- 目前支持公开市场工作流和通用文生图、通用文本生成；暂不提供私有 Skill 管理或团队协作。
- 当前使用 SQLite，按单实例部署。需要多人规模化部署时，请先看[配置和存储说明](docs/SELF-HOSTING.md)。

## 开发

Next.js · React · TypeScript · SQLite

```bash
npm test
npm run build
```

测试使用模拟接口，不会提交真实付费任务。部署、环境变量和数据处理说明见[自部署与开发](docs/SELF-HOSTING.md)，浏览器检查步骤见 [QA 文档](docs/QA.md)。

遇到问题可以[提 Issue](https://github.com/maimaimangmang/AI-Skill-Batch/issues)。写清楚操作步骤和报错内容即可，别附上 API Key 或含私人数据的任务表。

## 许可证

[MIT](LICENSE)。可以修改和自部署，保留许可证中的版权声明即可。第三方依赖遵循各自许可证。

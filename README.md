# AI Skill Batch

![LoomDesk](docs/brand/loomdesk-logo-preview.png)

**批量调用 Skill，也能把自己的 Skill 上架收费。**

你可以选别人做好的 Skill，把一批任务填进表格，一起提交执行；也可以把自己做好的 Skill 上传到 LoomLoom 商城，设置调用价格，让别人付费使用。

Skill 在服务端黑盒执行。使用者按要求提供输入、收取结果，不需要安装 Skill、搭建内部流程；作者可以提供可调用的能力，保留内部提示词和编排逻辑。

[在线使用](https://loomdesk-production.up.railway.app/) · [先看演示，无需 Key](https://loomdesk-production.up.railway.app/?demo=1) · [上架自己的 Skill](https://www.shengsuanyun.com/zh/loomloom) · [自行部署](docs/SELF-HOSTING.md)

网页里的名字是 **LoomDesk**，是接入胜算云 LoomLoom 的独立开源工作台。批量填写、提交和查看结果在这里完成；自定义 Skill 的上传、定价和上架审核在 LoomLoom 平台完成。运行真实任务需要自己的胜算云 API Key。

## 填表调用，Skill 在云端黑盒执行

使用一个 Skill，你只需要知道它要什么输入、能交付什么结果。例如，给商品图 Skill 提供参考图和商品信息，就能提交生成任务，不必把作者的提示词和多步流程重新搭一遍。

这里的「黑盒」指作者的内部提示词和工作流编排不向调用者公开。你仍能查看公开的输入说明、价格、任务状态和返回结果。黑盒执行由 LoomLoom 服务提供，开源这个网页工作台不会公开商城 Skill 的内部实现。

有 30 个商品要做图，就填 30 行。每行对应一个任务，确认费用后批量提交，在「我的任务」集中查看进度和结果，支持导出 Excel。任务在云端继续运行，不用一直开着网页等待。

## 上传自己的 Skill，自主定价上架

如果你已经做出一个好用的 Skill，可以把它适配成 LoomLoom 工作流，上传到商城并设置每个任务的调用价格。审核通过后，别人就能从市场找到它、填表调用，你按平台规则获得调用收益。

从侧栏的「上架自定义工作流」进入 [LoomLoom 平台](https://www.shengsuanyun.com/zh/loomloom)，完成这几步：

1. 准备自己的 Skill，明确使用者要填什么、最终会得到什么；已有 Skill 需要先适配为平台支持的工作流。
2. 上传并用少量样例测试，确认输入、输出和执行流程符合预期。
3. 填写名称、介绍、输入说明和结果示例，设置调用价格，提交上架审核。
4. 审核通过后公开售卖，使用者可以在 LoomDesk 中搜索并批量调用。

例如，把自己调好的商品套图流程做成一个 Skill：使用者上传商品图，你的工作流在云端完成处理并返回套图。你设置 Skill 调用费，使用者在运行前确认费用，模型用量费用另计。

上传适配、审核和收益规则见 [LoomLoom 使用手册](https://lean.shengsuanyun.com/apidocs/loomloom/guide/loomloom-manual)。当前网页提供上架入口；创作者在 LoomLoom 平台管理自己的 Skill。

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

**尚未提交的表格草稿只保存在当前页面，刷新前记得另存。**

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
- 运行端支持公开市场 Skill 和通用文生图、通用文本生成。自定义 Skill 通过侧栏入口前往 LoomLoom 上传、定价和上架；本项目暂不提供站内私有 Skill 编辑器或团队协作。
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

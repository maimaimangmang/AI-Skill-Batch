# LoomSkill 获客与产品优化计划

更新：2026-10-27

产品定位保持为 AI Skills 发现与批量执行平台，覆盖图片、视频、文案、汇报等任务（汇报入口当前提供提纲与检查，不宣称生成 PPT 文件）。首页帮助用户了解平台、浏览和选择工作流；各用途的搜索页面承接具体需求。商品图是已有真实案例的一项场景试验，不代表平台整体定位，也没有证据支持将全站用户优先限定为电商卖家。

## 市场判断及证据

| 官方页面观察 | 对 LoomSkill 的启发 |
| --- | --- |
| [Photoroom Batch](https://www.photoroom.com/batch) 以批量编辑商品照片、统一商品目录视觉为入口。 | 用户购买的是完成商品素材的结果。页面先回答“我能得到什么”，再解释工作流。 |
| [Pebblely](https://www.pebblely.com/) 展示一张产品图制作多种营销素材，并提供批量生成和大量视觉场景。 | 真实图片比抽象的功能清单更容易解释价值；LoomSkill 应展示输入、提示词、结果的完整过程。 |
| [Google 的有用内容指南](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) 强调原创信息、实际经验与对读者有用的完整说明。 | 先完善已有真实案例，不批量铺设只有关键词替换的场景页。 |

以上图片工具观察只适用于图片场景，不能据此推断全站定位、市场份额、关键词搜索量或竞品能力排名。LoomSkill 的表格批量功能也不能直接宣称独有。可验证的组合是：浏览现成工作流、按行准备任务、连接胜算云执行、统一查看结果。优势是否足以让人复用，需要用户行为验证。

## 场景试验与阻力

1. 电商运营：有产品原图，需要场景图或套图。当前已有商品图工作流和真实案例，可以单独验证对应场景页。
2. 需要许多提示词出图的内容团队：Excel / CSV 输入匹配重复任务，但应先证明导入与首批任务可顺利完成。
3. Skill 创作者：可带来更多内容和传播，但当前没有证据表明“更多 Skill 数量”能解决新用户的首次使用障碍。

待验证的共性阻力是陌生用户看不懂 Skill、不知道结果质量、不了解 API Key 和计费。需要分别观察图片、视频、文案、汇报等用途的实际需求和使用障碍。商品图案例页的试验只衡量这个场景的效果，不用它的转化率代表整个平台，也不预设其他用途价值较低。

## 本轮实现

- 新增四类双语用途指南 `/use-cases/images`、`/use-cases/video`、`/use-cases/writing`、`/use-cases/presentations`，每页有独立的准备步骤、结果检查、实际工作流公开输入示例和匹配目录。
- 首页推荐改为四类代表性工作流。目录增加用途筛选，搜索和翻页保留类别；筛选 URL 不索引，独立指南提供 canonical/hreflang 并进入 sitemap。
- 新增 `/ai-product-photography` 与 `/en/ai-product-photography`，包含真实输入、成品、试跑要求、准备步骤、批量前检查、费用与能力边界。
- 首页首要操作保持“探索 Skill”，第二操作为通用使用流程；简介明确列出图片、视频、文案、汇报，不将全站流量引向商品图。
- 批量生图页补充下载当前工作流模板、列名匹配、选择导入行、UTF-8 和附件检查说明。
- 商品图相关工作流、案例页与批量指南互相连接；新页面加入 sitemap，配置各语言 canonical、hreflang 和社交分享图。
- 保留已有手机布局和轮播。案例不是批量成功率证明，不使用虚构销量、用户数、节省时间或排名承诺。

## 搜索需求与页面分工

以下是候选搜索意图，不是经过搜索量工具验证的关键词。用 Search Console 的实际查询决定后续扩写。

| 用户需求 | 页面 | 内容重点 |
| --- | --- | --- |
| AI 商品图、产品场景图、AI product photography | `/ai-product-photography` 及英文页 | 真实前后输入与效果、产品保真检查、首张试跑 |
| Excel 批量生图、CSV image generation、batch AI images | `/batch-image-generation` 及英文页 | 按行输入、下载模板、列映射、检查和提交 |
| 具体工作流的名称或用途 | 对应 `/skills/...` 及英文页 | 当前字段、示例、参数、费用与执行入口 |

## 收录与效果衡量

Google Search Console 域名所有权已于 2026-10-27 通过 DNS 验证。`https://loomskill.com/sitemap.xml` 已提交并成功处理，Google 显示已发现 492 个网址。包含四类用途指南、商品图案例与现有双语公开页面；发现网址不等于已收录。站点地图是发现 URL 的线索，不保证收录或排名，参见 [Google sitemap 指南](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)。

每周比较一次，初期按 28 天窗口观察自然搜索。新站样本小，不能用一两天的波动判断方案成败。

| 指标 | 分母与解释 | 当前可用性 |
| --- | --- | --- |
| 可索引页面与收录状态 | 按目标页面检查排除原因，不追求所有低价值 URL 被收录 | 页面技术检查已通过；Google 已读取 sitemap，页面收录状态需单独检查 |
| 搜索展示、点击、CTR | 点击 / 展示；按国家、语言、查询和页面拆分 | 域名所有权已于 2026-10-27 验证；等待 Google 处理数据 |
| 场景页到工作流的点击率 | 去工作流的访问会话 / 场景页会话 | 尚未安装分析系统，不能宣称已有转化基线 |
| 首次任务成功率 | 至少一个成功任务的首次执行者 / 首次提交者 | 需另外设计服务端统计，不能从网页访问量推算 |
| 重复使用 | 首次成功后一段时间内再次成功执行的用户比例 | 待真实使用样本与统计方案 |

目前 Nginx 默认访问日志由本站和 `api.loomskill.com` 共用，尚未验证日志格式能否可靠区分站点，不能拿其总请求数当 LoomSkill 用户数。本轮不增加第三方追踪脚本、不记录 API Key、用户提示词或上传内容。后续若接入分析，事件只用预定义动作及页面分类，避免把表单值、完整 URL 查询参数和凭据送入分析工具。

## 内容分发顺序

商品图场景可用一组真实案例制作中文短教程与英文操作说明，分别链接到匹配语言的案例页。这只是一个内容系列；其他用途应根据现有工作流、可公开的真实案例与搜索反馈补充。验证用户会不会点击进入工作流，再决定增加案例或分发渠道。站外发布需要选择具体账号和审核最终文案，本轮未自动发帖或私信。

1. 中文内容：演示“参考图 + 产品原图 + 明确要求 → 一次生成结果”，说明什么需要人工检查，末尾给出案例页。
2. 英文内容：用 product photography / batch image workflow 解释用途，不要求用户先懂 Skill。内容呈现输入、实际结果和具体步骤。
3. 创作者合作：优先邀请已有优质工作流的作者补充可公开案例和失败边界。合作、邀约和消息发送另行执行。
4. 目录站提交或付费推广放在后面：先确定页面能解释产品，再审查具体站点的受众、费用及链接质量，不批量买链接。

### 中文演示文案草稿

**一张产品原图，怎么变成新的商品场景图？**

这次用一只陶瓷杯试了商品图工作流：参考图提供暖光和床头桌面的氛围，产品原图提供杯子，文字要求保留陶瓷质感、不加文案。

在 LoomSkill 打开商品图任务表，选择两张图片、填入要求，连接胜算云 API Key 并确认预估费用后执行。页面放了这次试跑的输入与结果。生成图仍需要检查杯型、商标和细节；先试一张，满意后再批量做。

完整案例：https://loomskill.com/ai-product-photography?utm_source=xiaohongshu&utm_medium=organic_social&utm_campaign=product_photo_case

### English demo draft

**From a product photo to a new scene: a real ceramic mug example**

Start with a clear product photo, add a style reference, and describe what should stay the same. This LoomSkill example uses a warm bedside setting while asking the model to preserve the mug’s ceramic material and add no text.

The guide shows the inputs and the actual test result. Open the workflow, prepare your images, then connect a Shengsuanyun API key and review the estimated cost before generating. Check product details on one result before preparing a batch.

See the example: https://loomskill.com/en/ai-product-photography?utm_source=x&utm_medium=organic_social&utm_campaign=product_photo_case

UTM 参数用于统一分发命名；当前没有分析系统，参数本身不会自动产生转化报告。

## 下一次决策

- 有展示、点击少：结合真实搜索词调整标题和摘要，确认页面承诺与搜索意图一致。
- 有点击、很少进入工作流：检查首屏是否展示效果，费用与 Key 是否解释清楚。
- 进入工作流、很少提交：观察具体卡在图片输入、模板导入、Key 连接还是费用确认，针对一步优化。
- 首次成功、无人复用：访谈任务频率与结果质量，不继续靠增加页面来掩盖产品问题。

没有足够样本时，邀请少量真实目标用户完成一次自己的任务并记录卡点，比根据猜测增加功能更有价值。邀约需确认具体对象与发送渠道。

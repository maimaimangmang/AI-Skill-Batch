# loom_web 复用评估

评估日期：2026-09-20。

来源：https://gitee.com/sunny-cx/loom_web

检查提交：`a1c811f12006d89e5bf273a220d81d652ae834bf`。

该仓库使用 Vue 3 / Vite / Pinia 前端与 Python FastAPI / SQLite 后端。已有市场列表和详情、报价执行、输入资产、任务与结果查询服务，因此帮助确认了 LoomLoom 买家功能的组织方式。

未直接复用源码的原因：

1. README 仅写明“遵循开源协议”，未找到具体 LICENSE 文件或 SPDX 许可证。不能据此把其源码重新作为 MIT 发布。
2. 密钥服务用固定的 `loom_api_key`、`openai_api_key` 数据项，并提供环境变量回退，主要是单套配置模型。LoomDesk 需要每个访问者持有独立 Key 和会话。
3. 该仓库重点包括聊天、工具执行、创作者管理和 Electron，超过本次市场批处理 MVP 范围。
4. 已确认交付栈为 Next.js / TypeScript，移植 Python / Vue 实现还需额外适配与维护。

LoomDesk 按官方公开接口重新实现，只使用公开 Listing schema，不调用或重建私有模板定义。未从该仓库复制组件、服务代码、资产或配置。

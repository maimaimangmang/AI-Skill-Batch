# Railway 部署

使用项目根目录的 Dockerfile 和 railway.toml 部署一个服务，不需要购买域名。首次部署先用试用额度验证；是否升级付费套餐由账号所有者决定。

## 服务配置

- 创建一个 LoomDesk 项目、一个 loomdesk 服务，保持单实例。
- 创建持久卷，挂载到 `/data`，保存 SQLite 会话和报价记录。
- Dockerfile 不声明 `VOLUME`：Railway 构建器不支持该指令。持久化由 Railway 挂载配置负责，本地 Docker Compose 也已显式配置卷。
- 设置 `PORT=3000`、`DATA_DIR=/data`、`COOKIE_SECURE=true`。
- 为云端单独生成 `SESSION_ENCRYPTION_KEY`（32 字节随机数的 64 位十六进制编码），保存在 Railway Variables 中。不要提交到源码。
- 当前 Docker 镜像使用非 root 用户。Railway 持久卷可能不可写；按官方文档设置 `RAILWAY_RUN_UID=0` 以兼容卷权限。
- 在 Networking 中 Generate Domain，目标端口 3000；将 `APP_ORIGIN` 设置为生成的完整 HTTPS 来源，不含路径或末尾斜杠。
- 不配置用户的胜算云 Key。每位用户从网页登录并承担自己的执行费用。
- 默认上游地址已内置，可不设置 `LOOMLOOM_BASE_URL`。

## 上传

使用 Railway 官方 CLI 登录后，在本项目目录关联目标项目和服务，执行 `railway up --detach`。`.railwayignore` 排除本地密钥、会话库及构建缓存；不要从上层个人资料目录上传。

上线前查看构建与运行日志，确认服务成功、HTTPS 首页与 `/api/session` 可访问，并验证同源登录请求通过来源校验、跨站请求被拒绝。健康检查只验证 HTTP 服务可访问，不代表付费工作流已验证。

实际 Key 登录和工作流执行需另外验收，付费执行前必须确认报价。平台图片步骤的 gRPC 消息大小错误需 LoomLoom 上游修复，部署本站不会改变该限制。

参考：[CLI](https://docs.railway.com/cli)、[持久卷权限](https://docs.railway.com/volumes/reference)、[配置文件](https://docs.railway.com/config-as-code/reference)。

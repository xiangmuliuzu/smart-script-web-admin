# 智能剧本创作平台 PC 运维管理端

Vue 3 + Vite 应用，仅供运维管理员使用。认证使用若依原生接口，业务菜单来自后端 /getRouters。PC 用户端和企业端分别位于独立仓库，旧用户端主体页面不迁移。历史阶段文档仅用于追溯。

## 安装与运行

环境要求：Node.js `^20.19.0 || >=22.12.0`（见 `package.json` 的 `engines`）。

```bash
npm ci
npm run dev
```

开发服务器默认使用 `http://localhost:3000`。联调时设置 `VITE_API_TARGET` 指向后端；后端数据库初始化及启动见 [后端 README](../smart-script-backend/README.md)。

登录页的「忘记密码？」支持管理员用绑定的手机号自助重置，走 `POST /api/v1/pc-auth/admin/sms/send` 与 `POST /api/v1/pc-auth/admin/password/reset`；接口匿名可达，只接受 `user_type='00'` 的启用账号，未绑定手机号也返回统一提示以避免枚举。开发环境短信固定码为 `123456`，接口细节见 [PC 账号找回契约](../smart-script-backend/docs/contracts/2026-10-18-pc-account-recovery.md)。

三端按服务器目录部署：管理员端 `/`（http://124.221.131.38/）、用户端 `/user/`、企业端 `/enterprise/`。本管理端 Vite 基础路径固定为 `/`，Router 使用 `import.meta.env.BASE_URL`；生产构建的 `dist` 内容部署到站点根目录。服务器须优先处理两个子应用及站点级 API，再将管理端 SPA 路由回退到根目录的 `index.html`。子应用的 `dist` 分别部署到各自目录，不能共用根目录的 SPA 回退。

环境变量从 `.env.development` 读取，完整字段说明见 `.env.example`：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_APP_BASE_API` | `/dev-api` | 若依认证与系统 API 的统一前缀。**不得为空**——空值会把 `/login` 等 SPA 路由误代理到后端 |
| `VITE_API_TARGET` | `http://localhost:8080` | Vite 代理目标（本机 RuoYi 后端） |

## 校验与构建

```bash
npm run gate
```

该命令依次执行 lint、静态检查、测试和生产构建。各步骤也可单独运行：

| 命令 | 作用 |
| --- | --- |
| `npm run lint` | 检查 `src/` 中禁用的认证 / 权限写法 |
| `npm run typecheck` | 契约检查：确认生产页面调用真实契约，而不是测试副本 |
| `npm run test` | 单元测试 |
| `npm run build` | 生产构建 |

管理端遵循若依返回体和 RBAC 权限。客户端隐藏无权限操作，写入权限仍由后端校验。

## 目录导航

| 路径 | 内容 |
| --- | --- |
| `src/api/` | 接口封装，按域分文件（`adminChat` 沟通、`copyright` 版权、`trade` 交易等），系统类接口在 `system/`、`monitor/`、`user/` 子目录 |
| `src/views/` | 页面，按模块分目录：`system` 若依管理端、`chat` 沟通、`copyright` 版权、`trade` 交易、`content` 内容、`risk` 风控、`statistics` 统计等 |
| `src/router/` | 路由、动态菜单适配与组件映射 |
| `src/utils/` | `request`、若依返回体解包、菜单图标等公共工具 |
| `src/components/` | 跨页面复用组件 |
| `scripts/` | 自研静态检查脚本（不是标准 eslint） |
| `tests/` | `node --test` 单元测试 |
| `docs/` | 阶段交付文档，如 `docs/a4/` |

## 分支与提交规范

- `main`：日常开发分支，需保持可运行。
- `release`：受保护分支，禁止直接 push，只能提 PR，由项目经理在阶段验收通过后合并。
- 一次提交只解决一个明确问题，提交信息写清模块和动作。
- 不得提交编译错误、临时文件、个人配置和密钥。
- 涉及接口、表结构、状态枚举、权限的改动，须同步项目经理与关联开发 / 测试。
- **push 前先确认目标**：`git remote -v` 核对仓库，`git log --oneline -3` 核对历史是否接得上。历史对不上时不要用 `--force`，先把情况说清楚。

开发规范以仓库根目录 `rules.md` 为准。

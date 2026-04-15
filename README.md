<p align="center">
  <img src="assets/cabinet-wordmark.svg" alt="cabinet /ˈkab.ɪ.nət/" width="920">
</p>

<h1 align="center">AI Agent 工作站</h1>

<p align="center">
  <strong>Cabinet 知识库 + Multica 任务调度 = 你的本地 AI 团队</strong><br />
  <sub>📋 Issue 看板 &nbsp;•&nbsp; 🤖 多 Agent 并行 &nbsp;•&nbsp; 📚 知识自动沉淀 &nbsp;•&nbsp; 🔒 100% 本地运行</sub>
</p>

<p align="center">
  <a href="https://github.com/8676311081/cabinet/releases"><img src="https://img.shields.io/github/v/release/8676311081/cabinet?style=for-the-badge&label=Download%20DMG&color=f5b301" /></a>&nbsp;
  <a href="https://github.com/8676311081/cabinet/stargazers"><img src="https://img.shields.io/github/stars/8676311081/cabinet?style=for-the-badge&logo=github&color=f5b301" /></a>&nbsp;
  <a href="https://github.com/hilash/cabinet"><img src="https://img.shields.io/badge/upstream-hilash%2Fcabinet-blue?style=for-the-badge" /></a>&nbsp;
  <a href="https://github.com/multica-ai/multica"><img src="https://img.shields.io/badge/upstream-multica--ai%2Fmultica-blue?style=for-the-badge" /></a>
</p>

---

## 这是什么

把两个开源项目合体，做成一个**双击就能用的 AI Agent 桌面应用**：

- **[Cabinet](https://github.com/hilash/cabinet)** — AI 知识库：Markdown 文件系统 + WYSIWYG 编辑器 + Agent 面板
- **[Multica](https://github.com/multica-ai/multica)** — AI 任务调度：Issue 看板 + 多 Agent 执行 + 实时输出

```
你创建 Issue → Agent 自动认领 → 执行任务 → 产出写入知识库 → 知识越用越多
```

**由 GPT-5 和 Claude Opus 4.6 共同辅助创作。**

---

## 30 秒看懂

| 你做的 | Agent 做的 |
|--------|-----------|
| 创建 Issue："调研 MCP 生态" | 搜索 + 整理 + 写报告到知识库 |
| 创建 Issue："修复登录 bug" | 读代码 + 定位 + 提交 PR |
| 创建 Issue："生成日报" | 拉 GitHub 数据 + 写 Markdown 日报 |
| @11 @二狗 "一起分析" | 两个 Agent 并行工作，各自回复 |

---

## 功能

| 功能 | 说明 |
|------|------|
| **Issue 看板** | 创建任务、设优先级、assign 给 Agent |
| **多 Agent** | 11、二狗、22... 并行执行，@mention 协作 |
| **实时输出** | Agent 工作过程实时可见（thinking/tool/text 流） |
| **知识库** | Markdown 文件系统，Agent 产出自动沉淀 |
| **WYSIWYG 编辑器** | 富文本编辑，代码块，表格，slash 命令 |
| **Git 版本控制** | 每次保存自动 commit，可回滚到任意版本 |
| **项目管理** | 项目 + 子任务 + 看板视图 |
| **收件箱** | Agent 回复/任务完成的通知聚合 |
| **定时任务** | Cron 调度，每天自动跑 GitHub 监控等 |
| **终端** | 内嵌 Web 终端（xterm.js） |
| **100% 本地** | 数据不离开你的机器，嵌入式 PostgreSQL |

---

## 安装

### 方式一：下载 DMG（普通用户，最简单）

1. 从 [Releases](https://github.com/8676311081/cabinet/releases) 下载 `Cabinet-xxx-arm64.dmg`
2. 双击安装，拖到 Applications
3. 打开 Cabinet，等几秒自动初始化完成

> Cabinet 会自动启动内嵌的 multica-server（端口 18080）、创建默认用户和认证 token、初始化知识库。你不需要配置任何东西。

4. 安装 Agent 运行依赖（至少装一个）：

```bash
# Claude Code（推荐）
npm install -g @anthropic-ai/claude-code
# 首次运行需要登录
claude

# 或者 Codex
npm install -g @openai/codex
```

5. 安装并启动 Agent Daemon：

```bash
# 安装 multica CLI
brew install multica-ai/tap/multica

# 登录到 Cabinet 的内嵌 server
multica auth login --server-url http://localhost:18080
# 输入 PAT token（在 Cabinet 应用的终端里运行以下命令获取）：
# cat ~/Library/Application\ Support/cabinet/multica-pat.json

# 选择要监听的 workspace
multica workspace list                          # 查看 workspace ID
multica workspace watch <workspace-id>          # 开始监听

# 启动 daemon（保持运行）
multica daemon start --foreground
```

6. 完成！在 Cabinet 里创建 Issue 并 assign 给 Agent，它会自动执行任务。

---

### 方式二：从源码运行（开发者）

适合想修改代码、调试或二次开发的人。

#### 环境要求

| 依赖 | 版本 | 安装 |
|------|------|------|
| Node.js | 20+ | `brew install node` |
| Go | 1.26+ | `brew install go` |
| PostgreSQL | 17 | `brew install postgresql@17`（或用 Docker） |
| pnpm | 9+ | `npm install -g pnpm` |
| 至少一个 AI CLI | | Claude Code 或 Codex（见上面） |

#### 第一步：克隆项目

```bash
git clone https://github.com/8676311081/cabinet.git
cd cabinet
npm install
```

#### 第二步：启动 Multica 后端

Cabinet 的事项管理、Agent 调度等功能由 Multica 后端提供。你需要单独启动它：

```bash
# 克隆 multica（如果还没有）
cd ..
git clone https://github.com/multica-ai/multica.git
cd multica

# 启动数据库 + 运行迁移
make setup        # 首次：创建数据库、运行迁移
make dev          # 启动 Go 后端（端口 8080）
```

> `make setup` 会自动启动 PostgreSQL Docker 容器、创建 `multica` 数据库、运行所有迁移。
> 如果你不用 Docker，确保本地 PostgreSQL 在运行，然后编辑 `.env` 里的 `DATABASE_URL`。

#### 第三步：配置 Cabinet 连接 Multica

```bash
cd ../cabinet
cp .env.example .env.local
```

编辑 `.env.local`：

```bash
# 指向你的 multica 后端
MULTICA_API_URL=http://localhost:8080
NEXT_PUBLIC_MULTICA_API_URL=/multica-api
NEXT_PUBLIC_MULTICA_WS_URL=ws://localhost:8080/ws

# 认证 token（从 multica 获取）
# 先在 multica 里创建用户并获取 PAT：
#   cd multica/server
#   multica auth login
#   multica config show   # 查看 token
# 把 token 填到这里：
NEXT_PUBLIC_MULTICA_PAT=mul_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **如何获取 PAT token**：
> ```bash
> cd multica/server
> go run ./cmd/multica auth login    # 浏览器登录
> go run ./cmd/multica config show   # 显示 token
> ```
> 复制 `token` 字段的值填到 `.env.local` 的 `NEXT_PUBLIC_MULTICA_PAT` 里。

#### 第四步：启动 Cabinet

```bash
npm run dev:all    # 启动 Next.js（3000）+ Cabinet Daemon（3001）
```

打开 http://localhost:3000，应该能看到知识库和 Multica 的事项/收件箱。

#### 第五步：启动 Agent Daemon

```bash
cd ../multica/server

# 监听 workspace
go run ./cmd/multica workspace list              # 查看 workspace ID
go run ./cmd/multica workspace watch <ws-id>     # 开始监听

# 启动 daemon
go run ./cmd/multica daemon start --foreground
```

Daemon 启动后会自动：
- 注册 runtime（Claude/Codex/OpenCode）
- 开始轮询任务队列
- 认领并执行被 assign 给 Agent 的 Issue

#### 第六步：验证

1. 在 Cabinet 左侧点"事项"
2. 点 board 列头的 "+" 创建一个 Issue
3. Assign 给一个 Agent
4. 在 Issue 详情页看 Agent 实时工作过程
5. 完成后检查知识库是否有新文档

#### 目录结构

```
cabinet/                    # 前端 + Electron 桌面应用
├── src/                   # Next.js 源码
├── electron/              # Electron 主进程
├── packages/
│   ├── multica-core/      # Multica 数据层（API、Store、Hook）
│   ├── multica-views/     # Multica UI 组件（Issue、Inbox 等）
│   └── multica-ui/        # 基础 UI 组件（shadcn/base-ui）
├── server/                # Cabinet Daemon（终端、定时任务）
└── data/                  # 知识库文件（Markdown）

multica/                    # 后端 + CLI + Agent 运行时
└── server/
    ├── cmd/server/        # HTTP API 服务
    ├── cmd/multica/       # CLI 工具
    ├── internal/daemon/   # Agent Daemon（任务执行引擎）
    ├── internal/handler/  # API Handler
    ├── pkg/agent/         # Agent 后端（Claude/Codex/OpenCode）
    └── migrations/        # 数据库迁移
```

#### 常用命令

```bash
# Cabinet
npm run dev:all            # 启动 Cabinet 开发服务
npm run build              # 生产构建
npm run electron:package   # 打包 Electron 应用

# Multica
make dev                   # 启动后端
make test                  # 运行测试
make sqlc                  # 重新生成 SQL 代码（修改 queries/ 后需要）
make daemon                # 启动 daemon
```

---

### 方式三：Docker 部署（已验证）

适合部署到服务器，或不想装 Node/Go 的情况。

```bash
git clone https://github.com/8676311081/cabinet.git
git clone https://github.com/multica-ai/multica.git

cd cabinet
docker compose up -d
```

会启动三个容器：

| 容器 | 端口 | 说明 |
|------|------|------|
| postgres | 5432（内部） | PostgreSQL 17 + pgvector |
| multica | 18081 | Multica API 后端 |
| cabinet | 3000 | Cabinet Web UI |

打开 http://localhost:3000 即可使用。

> 注意：Docker 模式下 Agent Daemon 需要在宿主机运行（因为 daemon 要调用本地的 Claude/Codex CLI）。
> ```bash
> multica auth login --server-url http://localhost:18081
> multica workspace list
> multica workspace watch <workspace-id>
> multica daemon start --foreground
> ```

停止：`docker compose down`
清除数据：`docker compose down -v`

---

### 方式四：VPS/云服务器部署

在远程服务器上部署，可以随时随地通过浏览器访问。

```bash
# 在 VPS 上
ssh your-server

git clone https://github.com/8676311081/cabinet.git
git clone https://github.com/multica-ai/multica.git

cd cabinet
docker compose up -d

# 配置 Nginx 反代（可选）
# server {
#     listen 80;
#     server_name your-domain.com;
#     location / { proxy_pass http://127.0.0.1:3000; }
#     location /multica-api/ { proxy_pass http://127.0.0.1:18081/api/; }
# }
```

> Agent Daemon 可以在你本地电脑跑，连远程 server：
> ```bash
> multica auth login --server-url http://your-server:18081
> multica daemon start --foreground
> ```
> 这样 Agent 在你本地执行任务，但任务调度和知识库在服务器上。

---

### 方式五：局域网共享

在本地跑 Cabinet，让同一网络的其他人通过浏览器访问。

```bash
# 启动 Cabinet（默认绑定所有网卡）
npm run dev:all

# 查看你的局域网 IP
ifconfig | grep "inet " | grep -v 127.0.0.1
# 比如 192.168.1.100
```

其他人在浏览器打开 `http://192.168.1.100:3000` 即可访问。

---

## 跟 Claude Managed Agents 对比

| | Claude Managed Agents | 本项目 |
|---|---|---|
| 运行环境 | Anthropic 云端 | 你的电脑 |
| 费用 | $0.08/session-hour + token | 只有 token 费用 |
| 数据隐私 | 云端 | 100% 本地 |
| 知识沉淀 | 需外接 Notion/Slack | 内置知识库 |
| 自定义 | API 调用 | 完全可控源码 |
| 多 Agent | 支持 | 支持 |
| 实时输出 | WebSocket | WebSocket |

---

## 本 Fork 的改动

详见 [FORK.md](FORK.md)。主要改动：

**Cabinet 侧：**
- Multica 集成（事项/项目/收件箱/智能体）
- 固定端口 18080 + 动态 PAT 认证
- 知识库 sidebar 修复 + 折叠状态持久化
- Create Issue 崩溃修复
- 中文汉化

**Multica 侧：**
- Agent 流式 idle timeout（5min 无输出自动 kill）
- Ghost task 自动清理
- 任务完成后自动 push 到知识库
- 多 assignee 支持
- 知识库索引自动注入 Agent context
- 嵌入式模式 seed owner

---

## 致谢

### 上游开源项目

- **[Cabinet](https://github.com/hilash/cabinet)** by [Hila Shmuel](https://x.com/HilaShmuel) — AI-first 知识库，MIT License
- **[Multica](https://github.com/multica-ai/multica)** by Multica AI — AI Agent 任务调度平台，MIT License

### AI 辅助创作

本项目由 **GPT-5** 和 **Claude Opus 4.6** 共同辅助完成：
- GPT-5：前期架构设计、功能规划
- Claude Opus 4.6 (1M context)：代码实现、调试、Review、测试

---

## License

- **Cabinet** 上游未指定显式 License
- **Multica** 使用 Modified Apache 2.0（禁止未授权 SaaS 托管，内部使用 OK）
- 本 Fork 的修改部分采用 Apache 2.0

详见 [LICENSE](LICENSE) 文件。本项目仅供个人/内部使用，不作为商业托管服务。

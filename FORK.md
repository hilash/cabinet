# Cabinet + Multica: AI Agent 工作站

基于两个优秀的开源项目，整合为一个完整的 AI Agent 工作站。

## 基于的开源项目

### 1. [Cabinet](https://github.com/hilash/cabinet) by Hila Shmuel
- AI-first 知识库和 Startup OS
- Markdown 文件系统 + WYSIWYG 编辑器
- 本地 AI Agent 面板（Claude CLI 集成）
- Electron 桌面应用
- MIT License

### 2. [Multica](https://github.com/multica-ai/multica) by Multica AI
- AI-native 任务管理平台（类似 Linear）
- Agent 作为一等公民：可以被 assign issue、执行任务、回复评论
- 本地 Daemon 运行时 + 多 Agent 调度
- Go 后端 + Next.js 前端 monorepo
- MIT License

## 本 Fork 的改动

在原版基础上做了以下整合和改进：

### Cabinet 改动
- **Multica 集成**：嵌入 multica-server，事项/项目/收件箱/智能体页面
- **固定端口**：multica-server 默认 18080，daemon 可稳定连接
- **动态 PAT**：启动时自动创建认证 token，不再硬编码
- **知识库 sidebar 修复**：文件树可滚动、折叠状态持久化
- **Create Issue 修复**：WorkspaceIdProvider 包裹 modal，项目页自动关联 project_id
- **中文汉化**：全部 14 个 UI 模块翻译

### Multica 改动
- **流式 idle timeout**：agent CLI 挂起 5 分钟无输出自动 kill
- **Ghost task 清理**：daemon 启动时自动清理孤儿任务
- **自动 push master**：agent 完成任务后自动推送到知识库
- **多 assignee**：issue_assignee 关联表 + API + 多 agent 协作
- **知识库索引注入**：agent 执行任务前自动注入 KB 文件目录
- **默认 instructions**：新建 agent 自动填入模板（含 git push 规则）
- **Sweeper 对齐**：running task timeout 与 agent timeout 对齐
- **Seed Owner**：嵌入式模式自动创建默认用户和 PAT

## 创作说明

本项目由 **GPT-5** 和 **Claude Opus 4.6** 共同辅助创作完成。

- GPT-5：前期架构设计、功能规划
- Claude Opus 4.6：代码实现、调试修复、review、测试

## 安装使用

### macOS（推荐）
下载 [Releases](../../releases) 页面的 DMG 文件，双击安装。

### 从源码运行
```bash
# Cabinet
cd cabinet
npm install
npm run dev:all

# Multica（可选，Cabinet 内嵌了 multica-server）
cd multica
make setup
make start
```

### 启动 Agent Daemon
```bash
cd multica/server
multica auth login --server-url http://localhost:18080
multica workspace watch <workspace-id>
multica daemon start --foreground
```

## License

本 Fork 遵循上游项目的 MIT License。

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Gemini Pro Chat

一个功能强大的全栈 AI 聊天应用，集成了 Google Gemini 3.0 Pro 和图像生成模型。

## 🚀 极简运行指南 (Quick Start)

本项目已内置自动化脚本，无需记忆复杂的 npm 命令。

### 1. 环境准备
*   确保已安装 Node.js (v18+)。
*   在项目根目录创建配置文件 `.env.local`：
    ```bash
    GEMINI_API_KEY=你的API密钥
    ```

### 2. 开发环境 (Development)
适用于修改代码、调试功能。支持热重载。

*   **启动**:
    ```bash
    sh run-dev.sh
    ```
    *访问地址: http://localhost:3000*

### 3. 生产环境 (Production)
适用于正式部署使用。脚本会自动构建前端资源，并以后台进程模式启动服务。

*   **启动**:
    ```bash
    sh run-prod.sh
    ```
    *   首次运行会自动安装依赖并打包，稍慢请耐心等待。
    *   启动成功后会显示 PID 和日志路径。
    *   *访问地址: http://localhost:3001*

*   **停止**:
    ```bash
    sh stop-prod.sh
    ```

---

## 📂 配置项说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `GEMINI_API_KEY` | 是 | Google Gemini API Key |
| `PORT` | 否 | 服务运行端口 (默认 3001) |


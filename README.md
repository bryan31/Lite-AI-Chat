<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Gemini Pro Chat

一个功能强大的全栈 AI 聊天应用，集成了 Google Gemini 3.0 Pro 和图像生成模型。

## 🚀 极简运行指南 (Quick Start)

### 1. 环境准备
*   确保已安装 Node.js (v18+)。
*   在项目根目录创建配置文件 `.env.local`：
    ```bash
    GEMINI_API_KEY=你的API密钥
    ```

### 2. 开发环境 (Development)
适用于修改代码、调试功能。

*   **启动**:
    ```bash
    sh run-dev.sh
    ```
    *访问地址: http://localhost:3000*

### 3. 生产环境 (Production)
适用于正式部署。会自动构建前端并后台运行。

*   **启动**:
    ```bash
    sh run-prod.sh
    ```
    *   初次运行会安装依赖并打包（Build）。
    *   访问地址: http://localhost:3001

*   **停止**:
    ```bash
    sh stop-prod.sh
    ```
*   **查看日志**:
    ```bash
    tail -f server.log
    ```

## 📂 目录结构
*   `src/` - 前端 React 代码
*   `server.js` - 后端 API 代理与静态文件服务
*   `dist/` - 构建后的静态资源 (运行 run-prod.sh 后生成)

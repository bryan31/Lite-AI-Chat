<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Gemini Pro Chat

一个功能强大的全栈 AI 聊天应用，集成了 Google Gemini 3.0 Pro 和图像生成模型。

## 🌟 项目架构

这是一个 **前后端分离** 的项目：
*   **前端 (Frontend)**: React + Vite (运行在浏览器)
*   **后端 (Backend)**: Node.js + Express (运行在服务器)

后端负责保护 API Key 并与 Google Gemini 服务器通信，前端负责 UI 展示。

---

## 🛠️ 1. 本地开发环境 (Local Development)

最简单的启动方式，适合开发和测试。

### 步骤
1.  **安装依赖**
    ```bash
    npm install
    ```

2.  **配置环境变量**
    在项目根目录创建一个 `.env.local` 文件：
    ```env
    # Gemini API Key (必需)
    GEMINI_API_KEY=你的真实API密钥
    ```
    *注意：后端代码已更新，会自动尝试读取 `.env.local` 文件。*

3.  **启动应用**
    ```bash
    npm run dev
    ```
    此命令会同时启动后端服务器 (Port 3001) 和前端开发服务器 (Port 3000)。前端通过 Vite 代理 (`vite.config.ts`) 将请求转发给后端。

4.  **访问**
    打开 http://localhost:3000

---

## 🚀 2. 生产环境部署 (Production Deployment)

在正式环境中，我们建议显式地设置环境变量，而不是依赖 `.env` 文件。

### 方案 A：前后端分离部署 (推荐)

适用于：前端托管在 Vercel/Netlify/Nginx，后端托管在 Railway/Render/云服务器。

#### 后端部署 (Server)
1.  将代码上传到你的后端服务器。
2.  **环境变量配置**：在服务器的环境变量设置界面（或 Docker compose）中设置：
    *   `GEMINI_API_KEY`: 你的 API Key
    *   `PORT`: (可选) 后端运行端口，默认 3001
    *   `CORS_ORIGIN`: 你的前端域名 (例如: `https://my-chat-app.com`)，用于解决跨域问题。如果不设置，默认为 `*` (允许所有)。
3.  **启动命令**：
    ```bash
    node server.js
    ```

#### 前端部署 (Client)
1.  **环境变量配置**：在构建前端**之前**，需要设置环境变量来告诉前端后端在哪里。
    *   `VITE_API_BASE_URL`: 后端的完整地址 + `/api`。
    *   例如，如果后端部署在 `https://api.myserver.com`，则设置为 `https://api.myserver.com/api`。
2.  **构建并部署**：
    ```bash
    # 在构建机上执行
    export VITE_API_BASE_URL=https://api.myserver.com/api
    npm run build
    ```
    将生成的 `dist/` 文件夹部署到静态托管服务 (Vercel, Netlify, Nginx 等)。

---

### 方案 B：单体部署 (Nginx 反向代理)

适用于：你有一台 Linux 服务器 (Ubuntu/CentOS)，想把前后端放在一起。

1.  **启动后端**
    使用 PM2 或 Docker 启动 `server.js`，监听 3001 端口。确保设置了 `GEMINI_API_KEY` 环境变量。

2.  **构建前端**
    ```bash
    npm run build
    ```
    这会生成 `dist` 目录。

3.  **配置 Nginx**
    配置 Nginx 既提供静态文件，又代理 API 请求。

    ```nginx
    server {
        listen 80;
        server_name your-domain.com;

        # 1. 前端静态文件
        location / {
            root /path/to/your/project/dist;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        # 2. 后端 API 代理
        location /api/ {
            proxy_pass http://localhost:3001/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
    ```

---

## 📂 环境变量参考

| 变量名 | 作用域 | 说明 |
|--------|--------|------|
| `GEMINI_API_KEY` | 后端 | **[必需]** Google Gemini API 密钥 |
| `PORT` | 后端 | 后端监听端口 (默认: 3001) |
| `CORS_ORIGIN` | 后端 | 允许跨域的前端域名 (生产环境建议设置) |
| `VITE_API_BASE_URL` | 前端 (构建时) | 指定后端的 API 地址 (例如 `https://api.example.com/api`)。如果未设置，前端默认请求相对路径 `/api`。 |

## 🔧 常见问题

**Q: 为什么我在服务器上运行时报错 `GEMINI_API_KEY is missing`?**
A: Node.js 在生产模式下通常不读取 `.env.local`。
1. 确保你在服务器的控制面板中添加了环境变量。
2. 或者在服务器目录下创建一个名为 `.env` 的文件（注意不是 .env.local），Node.js 的 `dotenv` 默认会读取它。

**Q: 前端部署后无法连接后端，提示 404?**
A: 检查 `VITE_API_BASE_URL` 是否正确设置。如果未设置，前端会请求 `https://前端域名/api/chat`。如果你是分离部署，这肯定会 404，因为后端在另一个域名。

**Q: 出现 CORS (跨域) 错误?**
A: 确保后端设置了 `CORS_ORIGIN` 环境变量为你的前端域名，或者暂不设置该变量（默认为允许所有）。
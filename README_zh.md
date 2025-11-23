[**🇺🇸 English**](README.md) | [**🇨🇳 中文文档**](README_zh.md)
</div>

# Lite Ai Chat

**一个功能极其强大的全栈 AI 助手，无缝集成了 Google 最新的 Gemini 3.0 Pro 推理模型与 Nano Banana 视觉生成模型。**

它不仅仅是一个聊天机器人，更是一个集成了**复杂推理、创意绘画、视觉理解、联网搜索**于一体的 AI 工作台。无需繁琐配置，开箱即用。

<br/>

---

## ✨ 核心亮点 (Why use this?)

### 🧠 顶级推理能力 (Gemini 3.0 Pro)
内置 Google 最新的 **Gemini 3.0 Pro** 模型，拥有业界顶尖的逻辑推理、代码编写和复杂问题解决能力。无论是撰写长文、分析数据还是生成代码，响应速度极快且精准。

### 🎨 创意绘画与图像编辑 (Image Generation)
集成 **Gemini Image (Nano Banana)** 模型。
*   **文生图**: 输入 "一只在太空冲浪的赛博朋克猫"，瞬间生成高清图像。
*   **图生图/修图**: 上传一张草图或照片，告诉 AI "把它变成油画风格" 或 "在旁边加一只狗"，实现精准的图像修改与创作。

### 👀 全能多模态视觉 (Multimodal Vision)
"长了眼睛"的 AI。你可以上传文档截图、风景照或复杂的图表，Gemini 能精准识别图片细节，提取文字，甚至为你解释图表中的数据趋势。

### 🌐 实时联网搜索 (Google Search Grounding)
告别过时信息。开启 **Web Search** 功能后，AI 会利用 Google 搜索实时获取最新的新闻、天气、股价和体育比分，并提供带引用来源的精准回答，极大减少"幻觉"。

### ⚡ 极致的用户体验
*   **流式响应**: 像打字机一样实时输出内容，无需漫长等待。
*   **Markdown 完美渲染**: 代码高亮、表格、数学公式完美显示。
*   **本地历史记录**: 聊天记录安全存储在本地浏览器，随时回看。
*   **深色模式**: 自动跟随系统或手动切换，护眼又美观。

---

## 🚀 极简运行指南 (Quick Start)

### 1. 环境准备
*   确保已安装 Node.js (v18+)。
*   在项目根目录创建配置文件 `.env.local`：
    ```bash
    GEMINI_API_KEY=你的API密钥
    ```

### 2. 开发环境 (Development)
适用于修改代码、调试功能。前端支持热更新。

*   **启动**:
    ```bash
    sh run-dev.sh
    ```
    *访问地址: http://localhost:3000*

### 3. 生产环境 (Production)
适用于正式部署。会自动构建前端并后台运行，高性能稳定模式。

*   **启动**:
    ```bash
    sh run-prod.sh
    ```
    *   初次运行会安装依赖并打包（Build）。
    *   访问地址: http://localhost:3000

*   **停止**:
    ```bash
    sh stop-prod.sh
    ```
*   **查看日志**:
    ```bash
    tail -f server.log
    ```

---

## 🛠️ 技术栈
*   **Frontend**: React 19, Vite, TailwindCSS, Lucide Icons
*   **Backend**: Node.js, Express (API Proxy)
*   **AI SDK**: Google GenAI SDK (`@google/genai`)
*   **Storage**: IndexedDB (用于高性能存储大尺寸图片)

## 📂 目录结构
*   `src/` - Frontend React code
*   `server.js` - Backend API proxy & static file service
*   `dist/` - 构建后的静态资源 (运行 run-prod.sh 后生成)
*   `run-*.sh` - 快捷运行脚本
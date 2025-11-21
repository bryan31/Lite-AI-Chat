<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Gemini Pro Chat - AI 聊天应用

基于 Google Gemini 3.0 Pro 和 Nano Banana 模型的强大 AI 聊天界面，支持文本对话、图像生成和网络搜索增强功能。

在 AI Studio 中查看: https://ai.studio/apps/temp/2

## ✨ 核心功能

### 🤖 AI 对话
- 基于 **Gemini 3.0 Pro** 模型的智能文本对话
- **流式响应**：实时显示 AI 生成的内容
- 支持多轮对话，保持上下文连贯性
- Markdown 格式渲染（代码高亮、表格、列表等）

### 🎨 图像生成与编辑
- 使用 **Nano Banana** (gemini-2.5-flash-image) 模型生成图像
- 支持上传图像进行编辑和修改
- Base64 格式图像处理和展示
- 性能优化：使用 Blob URL 避免大型数据阻塞

### 🔍 网络搜索增强
- 集成 Google Search 工具 (Web Grounding)
- 显示搜索来源和引用链接
- 提供可点击的来源卡片

### 💾 会话管理
- 创建和管理多个对话会话
- 查看历史对话列表
- 一键删除会话
- 自动保存到浏览器本地存储
- 会话标题自动生成

### 🎨 用户体验
- 🌓 深色/浅色主题切换
- 📱 响应式设计（移动端和桌面端适配）
- ⚡ 自动滚动到最新消息
- 📝 输入框自适应高度
- ⏳ 优雅的加载动画
- 📋 一键复制消息
- 🖼️ 图像附件预览

## 🛠️ 技术栈

- **前端框架**: React 19.2.0
- **开发语言**: TypeScript 5.8.2
- **构建工具**: Vite 6.2.0
- **样式方案**: Tailwind CSS (CDN)
- **AI 引擎**: Google Gemini AI (@google/genai 1.30.0)
- **Markdown**: react-markdown + remark-gfm
- **代码高亮**: rehype-highlight + highlight.js
- **图标库**: lucide-react

## 📦 快速开始

### 前置要求

- Node.js (建议 v18+)
- Gemini API 密钥 (从 [Google AI Studio](https://aistudio.google.com/app/apikey) 获取)

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd gemini-pro-chat
```

2. **安装依赖**
```bash
npm install
```

3. **配置 API 密钥**

编辑 `.env.local` 文件，将 `PLACEHOLDER_API_KEY` 替换为你的真实 Gemini API 密钥：

```env
GEMINI_API_KEY=你的真实API密钥
```

4. **启动开发服务器**
```bash
npm run dev
```

应用将在 http://localhost:3000 启动

### 使用脚本启动（推荐）

**启动应用**：
```bash
./run.sh
```

**停止应用**：
```bash
./stop.sh
```

## 📜 可用命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 🚀 部署

本项目是纯前端应用，可以部署到以下平台：

- **Vercel** - 推荐，原生支持 Vite
- **Netlify** - 静态网站托管
- **GitHub Pages** - 免费托管
- **AI Studio** - Google AI Studio 平台

### 部署注意事项

1. 确保在部署环境中配置 `GEMINI_API_KEY` 环境变量
2. API 密钥会在构建时注入到客户端代码中
3. 建议使用环境变量管理密钥，不要硬编码

## 📂 项目结构

```
gemini-pro-chat/
├── .env.local              # 环境变量配置
├── package.json            # 项目依赖和脚本
├── tsconfig.json           # TypeScript 配置
├── vite.config.ts          # Vite 构建配置
├── index.html              # HTML 入口文件
├── index.tsx               # React 应用入口
├── App.tsx                 # 主应用组件
├── types.ts                # TypeScript 类型定义
├── components/             # React 组件
│   ├── MessageItem.tsx     # 消息项组件
│   ├── MarkdownRenderer.tsx # Markdown 渲染组件
│   └── Sidebar.tsx         # 侧边栏组件
└── services/               # 服务层
    └── geminiService.ts    # Gemini API 服务
```

## 🔑 环境变量

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `GEMINI_API_KEY` | Google Gemini API 密钥 | 是 |

## 💡 使用指南

### 文本对话
1. 在输入框中输入问题或消息
2. 按 Enter 发送（Shift+Enter 换行）
3. AI 将实时生成回复

### 图像生成
1. 在消息中描述你想要的图像
2. AI 会自动判断是否需要生成图像
3. 生成的图像会显示在对话中

### 图像编辑
1. 点击附件按钮上传图像
2. 在消息中描述你想要的修改
3. AI 将基于原图生成新的图像

### 网络搜索
1. 询问需要最新信息的问题
2. AI 会自动启用 Web Grounding
3. 查看来源卡片了解信息出处

### 会话管理
- 点击侧边栏的"新建对话"创建会话
- 点击历史会话切换对话
- 点击垃圾桶图标删除会话

## 📝 数据存储

- 所有对话数据存储在浏览器的 **LocalStorage**
- 主题偏好存储在 `gemini-pro-theme`
- 会话历史存储在 `gemini-pro-history`
- 无需服务器，数据完全本地化
- 存储超限时自动保存精简版（移除图像数据）

## 🔧 性能优化

- ✅ Blob URL 替代 Base64，避免大型图像阻塞 UI
- ✅ 异步图像处理，使用 fetch 和 URL.createObjectURL
- ✅ 流式响应，实时显示 AI 生成内容
- ✅ 自适应文本框，根据内容自动调整高度
- ✅ LocalStorage 配额管理，优雅降级

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目使用 MIT 许可证

## 🔗 相关链接

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API 文档](https://ai.google.dev/docs)
- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)

---

💻 使用 [Google Gemini AI](https://ai.google.dev/) 驱动

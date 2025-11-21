#!/bin/bash

# Gemini Pro Chat 启动脚本
# 此脚本用于启动开发服务器

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# PID 文件路径
PID_FILE="$SCRIPT_DIR/.vite-dev.pid"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Gemini Pro Chat - 启动脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查是否已经在运行
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  检测到服务器已经在运行 (PID: $OLD_PID)${NC}"
        echo -e "${YELLOW}   请先运行 ./stop.sh 停止现有服务器${NC}"
        echo ""
        exit 1
    else
        # PID 文件存在但进程不存在，清理旧文件
        rm -f "$PID_FILE"
    fi
fi

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 Node.js${NC}"
    echo -e "${YELLOW}   请先安装 Node.js (建议版本 v18+)${NC}"
    echo -e "${YELLOW}   下载地址: https://nodejs.org/${NC}"
    echo ""
    exit 1
fi

# 显示 Node.js 版本
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js 版本: $NODE_VERSION${NC}"

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 npm${NC}"
    echo ""
    exit 1
fi

# 检查 .env.local 文件
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ 错误: 未找到 .env.local 文件${NC}"
    echo -e "${YELLOW}   请创建 .env.local 文件并配置 GEMINI_API_KEY${NC}"
    echo ""
    exit 1
fi

# 检查 API 密钥是否配置
if grep -q "PLACEHOLDER_API_KEY" .env.local; then
    echo -e "${YELLOW}⚠️  警告: 检测到 API 密钥未配置${NC}"
    echo -e "${YELLOW}   请编辑 .env.local 文件，将 PLACEHOLDER_API_KEY 替换为真实的 Gemini API 密钥${NC}"
    echo -e "${YELLOW}   获取密钥: https://aistudio.google.com/app/apikey${NC}"
    echo ""
    read -p "是否继续启动? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 未找到 node_modules，正在安装依赖...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 依赖安装失败${NC}"
        echo ""
        exit 1
    fi
    echo -e "${GREEN}✓ 依赖安装完成${NC}"
    echo ""
fi

# 启动开发服务器
echo -e "${GREEN}🚀 正在启动开发服务器...${NC}"
echo ""

# 在后台启动服务器并保存 PID
nohup npm run dev > "$SCRIPT_DIR/.vite-dev.log" 2>&1 &
SERVER_PID=$!

# 保存 PID 到文件
echo $SERVER_PID > "$PID_FILE"

# 等待服务器启动
echo -e "${YELLOW}⏳ 等待服务器启动...${NC}"
sleep 3

# 检查进程是否还在运行
if ps -p "$SERVER_PID" > /dev/null 2>&1; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ 服务器启动成功！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "  ${BLUE}本地访问:${NC}    http://localhost:3000"
    echo -e "  ${BLUE}网络访问:${NC}    http://0.0.0.0:3000"
    echo -e "  ${BLUE}进程 PID:${NC}    $SERVER_PID"
    echo -e "  ${BLUE}日志文件:${NC}    .vite-dev.log"
    echo ""
    echo -e "${YELLOW}提示:${NC}"
    echo -e "  - 使用 ${GREEN}./stop.sh${NC} 停止服务器"
    echo -e "  - 使用 ${GREEN}tail -f .vite-dev.log${NC} 查看实时日志"
    echo ""
else
    echo ""
    echo -e "${RED}❌ 服务器启动失败${NC}"
    echo -e "${YELLOW}请查看日志文件: .vite-dev.log${NC}"
    echo ""
    rm -f "$PID_FILE"
    exit 1
fi

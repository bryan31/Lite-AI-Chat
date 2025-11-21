#!/bin/bash

# Gemini Pro Chat 停止脚本
# 此脚本用于停止开发服务器

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
echo -e "${BLUE}   Gemini Pro Chat - 停止脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查 PID 文件是否存在
if [ ! -f "$PID_FILE" ]; then
    echo -e "${YELLOW}⚠️  未找到运行中的服务器${NC}"
    echo -e "${YELLOW}   PID 文件不存在: $PID_FILE${NC}"
    echo ""

    # 尝试查找并杀死可能的 vite 进程
    VITE_PIDS=$(pgrep -f "vite")
    if [ -n "$VITE_PIDS" ]; then
        echo -e "${YELLOW}但检测到以下 Vite 进程:${NC}"
        ps -p $VITE_PIDS -o pid,cmd
        echo ""
        read -p "是否要停止这些进程? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo $VITE_PIDS | xargs kill -9 2>/dev/null
            echo -e "${GREEN}✓ 已停止所有 Vite 进程${NC}"
            echo ""
        fi
    fi
    exit 0
fi

# 读取 PID
SERVER_PID=$(cat "$PID_FILE")

# 检查进程是否存在
if ! ps -p "$SERVER_PID" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  进程 (PID: $SERVER_PID) 不存在或已停止${NC}"
    rm -f "$PID_FILE"
    echo -e "${GREEN}✓ 已清理 PID 文件${NC}"
    echo ""
    exit 0
fi

# 显示进程信息
echo -e "${BLUE}进程信息:${NC}"
ps -p "$SERVER_PID" -o pid,cmd
echo ""

# 停止进程
echo -e "${YELLOW}🛑 正在停止服务器 (PID: $SERVER_PID)...${NC}"

# 首先尝试优雅地停止（SIGTERM）
kill "$SERVER_PID" 2>/dev/null

# 等待进程结束
WAIT_COUNT=0
MAX_WAIT=10

while ps -p "$SERVER_PID" > /dev/null 2>&1 && [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    echo -ne "\r${YELLOW}⏳ 等待进程停止... ($WAIT_COUNT/$MAX_WAIT 秒)${NC}"
done
echo ""

# 检查进程是否已停止
if ps -p "$SERVER_PID" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  进程未响应 SIGTERM，尝试强制停止 (SIGKILL)...${NC}"
    kill -9 "$SERVER_PID" 2>/dev/null
    sleep 1

    if ps -p "$SERVER_PID" > /dev/null 2>&1; then
        echo -e "${RED}❌ 无法停止进程${NC}"
        echo ""
        exit 1
    fi
fi

# 清理 PID 文件
rm -f "$PID_FILE"

# 同时尝试停止所有相关的 node 进程
NODE_PIDS=$(pgrep -f "vite.*gemini-pro-chat")
if [ -n "$NODE_PIDS" ]; then
    echo -e "${YELLOW}🧹 清理相关进程...${NC}"
    echo $NODE_PIDS | xargs kill -9 2>/dev/null
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 服务器已成功停止${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}提示:${NC}"
echo -e "  - 使用 ${GREEN}./run.sh${NC} 重新启动服务器"
echo ""

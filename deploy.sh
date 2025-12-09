#!/bin/bash

# Better Smokeping 部署腳本
# 適用於 Debian/Ubuntu 系統

set -e

echo "=================================="
echo "Better Smokeping 部署腳本"
echo "=================================="
echo ""

# 檢查是否為 root
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  警告: 正在以 root 用戶運行"
fi

# 檢測部署方式
echo "請選擇部署方式："
echo "1) Docker (推薦)"
echo "2) 手動部署"
read -p "請輸入選項 (1 或 2): " deploy_method

if [ "$deploy_method" == "1" ]; then
    echo ""
    echo "📦 使用 Docker 部署..."
    echo ""

    # 檢查 Docker
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker 未安裝"
        echo "正在安裝 Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
        echo "✅ Docker 安裝完成"
    else
        echo "✅ Docker 已安裝"
    fi

    # 檢查 Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose 未安裝"
        echo "正在安裝 Docker Compose..."
        apt-get update
        apt-get install -y docker-compose
        echo "✅ Docker Compose 安裝完成"
    else
        echo "✅ Docker Compose 已安裝"
    fi

    # 複製環境變數文件
    if [ ! -f .env ]; then
        echo "📝 創建環境變數文件..."
        cp .env.example .env
        echo "✅ 已創建 .env 文件"
    fi

    # 構建並啟動
    echo ""
    echo "🚀 正在構建和啟動服務..."
    docker-compose up -d --build

    echo ""
    echo "✅ 部署完成！"
    echo ""
    echo "📊 服務狀態："
    docker-compose ps
    echo ""
    echo "🌐 訪問地址: http://$(hostname -I | awk '{print $1}'):3000"
    echo "📝 查看日誌: docker-compose logs -f"
    echo "🛑 停止服務: docker-compose down"

elif [ "$deploy_method" == "2" ]; then
    echo ""
    echo "🔧 手動部署..."
    echo ""

    # 檢查 Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js 未安裝"
        echo "正在安裝 Node.js 20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
        echo "✅ Node.js 安裝完成"
    else
        node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -lt 20 ]; then
            echo "⚠️  Node.js 版本過舊 (需要 20+)"
            echo "正在更新 Node.js..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
        fi
        echo "✅ Node.js $(node -v) 已安裝"
    fi

    # 安裝系統工具
    echo "📦 安裝系統工具..."
    apt-get update
    apt-get install -y iputils-ping traceroute
    echo "✅ 系統工具安裝完成"

    # 安裝 Node 依賴
    echo "📦 安裝 Node.js 依賴..."
    npm install

    # 初始化資料庫
    echo "💾 初始化資料庫..."
    npx prisma db push

    # 添加種子數據
    read -p "是否添加默認監測目標? (y/n): " add_seed
    if [ "$add_seed" == "y" ]; then
        npm run db:seed
    fi

    # 構建
    echo "🔨 構建應用..."
    npm run build

    # 安裝 PM2
    if ! command -v pm2 &> /dev/null; then
        echo "📦 安裝 PM2..."
        npm install -g pm2
    fi

    # 啟動服務
    echo "🚀 啟動服務..."
    pm2 start npm --name "better-smokeping-web" -- start
    pm2 start scripts/monitor.js --name "better-smokeping-monitor"

    # 設置開機自啟
    read -p "是否設置開機自啟? (y/n): " auto_start
    if [ "$auto_start" == "y" ]; then
        pm2 startup
        pm2 save
    fi

    echo ""
    echo "✅ 部署完成！"
    echo ""
    echo "📊 服務狀態："
    pm2 status
    echo ""
    echo "🌐 訪問地址: http://$(hostname -I | awk '{print $1}'):3000"
    echo "📝 查看日誌: pm2 logs"
    echo "🛑 停止服務: pm2 stop all"

else
    echo "❌ 無效的選項"
    exit 1
fi

echo ""
echo "=================================="
echo "部署完成！祝你使用愉快！🎉"
echo "=================================="

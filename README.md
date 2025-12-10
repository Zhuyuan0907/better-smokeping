# Better Smokeping v2.0

現代化的網路監測系統，基於傳統 Smokeping 的理念，使用 Next.js 14 和 TypeScript 重新打造。

## ✨ 主要功能

### 📊 監測功能
- **ICMP Ping 監測** - 持續監測網路延遲和封包遺失
- **MTR 路由追蹤** - 可視化網路路徑和跳轉點
- **多時間範圍** - 支援 1 小時到 30 天的歷史數據
- **自動監測** - 每 60 秒自動執行一次 ping，無需手動操作

### 🎨 介面特色
- **中文化介面** - 完整的繁體中文介面
- **暗色主題** - 內建亮色/暗色主題切換
- **折疊式側邊欄** - 階層式分組顯示，支援大量監測目標
- **互動式圖表** - 時間軸拖拽選擇、RTT 趨勢、封包遺失直條圖
- **即時統計** - 平均延遲、最小/最大值、封包遺失率

### ⚙️ 配置管理
- **Smokeping 風格配置** - 使用熟悉的階層式配置語法
- **簡單易用** - 編輯 `config/smokeping.conf` 即可
- **自動同步** - 重啟服務自動載入配置

## 🚀 快速開始

### 配置監測目標

編輯 `config/smokeping.conf`:

```conf
*** Targets ***

+ DNS-Servers
menu = DNS 伺服器
title = DNS 伺服器監測

++ Google-DNS
menu = Google DNS
title = Google Public DNS
host = 8.8.8.8
```

### Docker 部署

```bash
# 確保 data 目錄權限
mkdir -p data
sudo chown -R 1001:1001 data

# 構建並啟動
docker-compose build --no-cache
docker-compose up -d

# 查看日誌
docker-compose logs -f
```

訪問：`http://localhost:3000`

## 📖 配置指南

詳見 [CONFIG_GUIDE.md](CONFIG_GUIDE.md)

## 🛠️ 技術棧

- Next.js 14, React 18, TypeScript
- Tailwind CSS, shadcn/ui, Recharts
- SQLite + Prisma ORM
- Docker, Alpine Linux

---

**Better Smokeping** - 讓網路監測更簡單、更美觀 🚀

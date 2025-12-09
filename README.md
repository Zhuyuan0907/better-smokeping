# Better Smokeping

一個現代化的網路監測系統，用於追蹤網路延遲、丟包率和路由路徑。使用 Next.js 全端框架開發，提供美觀的 UI 和強大的監測功能。

![Better Smokeping](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ 功能特色

- 🎯 **多目標監測** - 同時監測多個主機或 IP 地址
- 📊 **實時圖表** - 使用 Recharts 展示延遲和丟包率的時間序列數據
- 🔍 **Traceroute** - 查看網路路由路徑和每個跳點的延遲
- 📱 **響應式設計** - 支援桌面和移動設備
- 🎨 **現代化 UI** - 使用 Tailwind CSS 和 shadcn/ui 組件
- 💾 **本地資料庫** - SQLite 資料庫，無需額外配置
- 🐳 **Docker 支援** - 一鍵部署到任何支援 Docker 的環境
- 🔄 **自動監測** - 後台服務持續監測並記錄數據

## 📸 截圖

### 主控台
現代化的儀表板界面，顯示實時監測數據、延遲圖表和統計資訊。

### Traceroute
查看完整的網路路由路徑，包括每個跳點的 IP、主機名和延遲時間。

## 🚀 快速開始

### 使用 Docker（推薦）

這是最簡單的部署方式，適用於 Debian、Ubuntu 和其他 Linux 系統。

```bash
# 克隆倉庫
git clone https://github.com/yourusername/better-smokeping.git
cd better-smokeping

# 使用 Docker Compose 啟動
docker-compose up -d

# 查看日誌
docker-compose logs -f
```

服務將在 `http://localhost:3000` 啟動。

### 手動安裝

需要 Node.js 20+ 和 npm。

```bash
# 1. 克隆倉庫
git clone https://github.com/yourusername/better-smokeping.git
cd better-smokeping

# 2. 安裝依賴
npm install

# 3. 初始化資料庫
npx prisma db push

# 4. 構建應用
npm run build

# 5. 啟動 Web 服務器
npm start &

# 6. 啟動監測服務
node scripts/monitor.js &
```

## 📋 系統需求

### Docker 部署
- Docker 20+
- Docker Compose 1.27+
- 512MB RAM
- 1GB 磁碟空間

### 手動部署
- Node.js 20+
- npm 或 yarn
- Debian/Ubuntu: `apt install iputils-ping traceroute`
- 其他 Linux: 確保系統有 `ping` 和 `traceroute` 命令

## 🔧 配置

### 環境變數

創建 `.env` 文件：

```env
# 資料庫
DATABASE_URL="file:./prisma/smokeping.db"

# 監測設置
PING_INTERVAL=60000     # 監測間隔（毫秒），預設 60 秒
PING_COUNT=10           # 每次 ping 的數量，預設 10
PING_TIMEOUT=2000       # Ping 超時（毫秒），預設 2 秒

# 應用設置
NEXT_PUBLIC_APP_NAME="Better Smokeping"
```

### 添加監測目標

1. 打開 Web 界面 `http://your-server:3000`
2. 點擊側邊欄的 "Add Target" 按鈕
3. 填寫以下資訊：
   - **Name**: 目標名稱（例如：Google DNS）
   - **Host/IP**: 主機名或 IP 地址（例如：8.8.8.8）
   - **Description**: 可選的描述
   - **Group**: 分組名稱（預設：default）

4. 點擊 "Add Target" 保存

監測服務會自動開始監測新添加的目標。

## 📊 使用方式

### 查看監測數據

1. 在側邊欄選擇一個目標
2. 主頁面會顯示：
   - 平均延遲、丟包率、正常運行時間等統計資訊
   - 延遲時間序列圖表
   - 丟包率時間序列圖表

3. 使用時間範圍選擇器查看不同時段的數據：
   - 最近 1 小時
   - 最近 6 小時
   - 最近 24 小時
   - 最近 7 天
   - 最近 30 天

### 執行 Traceroute

1. 選擇一個目標
2. 在目標詳情頁面，點擊 "Run Traceroute" 按鈕
3. 或訪問 `/traceroute/[target-id]` 路徑

Traceroute 結果會顯示：
- 每個跳點的序號
- IP 地址和主機名
- 往返時間（RTT）
- 是否到達目的地

### 手動觸發 Ping

點擊主頁面右上角的 "Run Ping Now" 按鈕可以立即對當前選中的目標執行一次 ping 測試。

## 🏗️ 架構

```
better-smokeping/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── targets/       # 目標管理 API
│   │   ├── ping/          # Ping API
│   │   ├── traceroute/    # Traceroute API
│   │   └── statistics/    # 統計 API
│   ├── traceroute/        # Traceroute 頁面
│   ├── layout.tsx         # 全局佈局
│   ├── page.tsx           # 主頁面
│   └── globals.css        # 全局樣式
├── components/            # React 組件
│   ├── ui/               # UI 基礎組件
│   ├── TargetSidebar.tsx # 側邊欄
│   ├── LatencyChart.tsx  # 圖表組件
│   ├── StatsCards.tsx    # 統計卡片
│   └── AddTargetDialog.tsx # 添加目標對話框
├── lib/                   # 工具函數
│   ├── db.ts             # Prisma 客戶端
│   ├── monitoring.ts     # 監測服務
│   └── utils.ts          # 工具函數
├── prisma/               # Prisma 資料庫
│   └── schema.prisma     # 資料庫模型
├── scripts/              # 腳本
│   └── monitor.js        # 監測服務腳本
├── public/               # 靜態文件
├── Dockerfile            # Docker 配置
├── docker-compose.yml    # Docker Compose 配置
└── package.json          # 依賴配置
```

## 🔒 安全建議

1. **網路訪問控制**：如果部署在公網，建議使用反向代理（如 Nginx）並配置 HTTPS
2. **防火牆**：限制只允許必要的端口訪問
3. **定期備份**：定期備份 `prisma/smokeping.db` 資料庫文件
4. **資源限制**：在 Docker 中設置適當的資源限制

## 🛠️ 開發

### 本地開發

```bash
# 安裝依賴
npm install

# 初始化資料庫
npx prisma db push

# 啟動開發服務器
npm run dev

# 在另一個終端啟動監測服務
node scripts/monitor.js
```

開發服務器會在 `http://localhost:3000` 啟動，支援熱重載。

### 資料庫管理

```bash
# 查看資料庫
npx prisma studio

# 重置資料庫
npx prisma db push --force-reset

# 生成 Prisma 客戶端
npx prisma generate
```

## 📦 API 端點

### 目標管理

- `GET /api/targets` - 獲取所有目標
- `POST /api/targets` - 創建新目標
- `GET /api/targets/[id]` - 獲取單個目標
- `PATCH /api/targets/[id]` - 更新目標
- `DELETE /api/targets/[id]` - 刪除目標

### 監測數據

- `GET /api/ping/[id]?hours=24&limit=1000` - 獲取 Ping 結果
- `POST /api/ping/[id]` - 執行 Ping 測試
- `GET /api/traceroute/[id]?limit=10` - 獲取 Traceroute 結果
- `POST /api/traceroute/[id]` - 執行 Traceroute
- `GET /api/statistics/[id]?hours=24` - 獲取統計資訊

## 🐛 故障排除

### Docker 容器無法 Ping

確保容器有必要的網路權限：

```yaml
cap_add:
  - NET_RAW
  - NET_ADMIN
```

### 資料庫權限錯誤

確保資料庫文件和目錄有正確的權限：

```bash
chmod 755 prisma
chmod 644 prisma/smokeping.db
```

### 監測服務未運行

檢查監測服務日誌：

```bash
# Docker
docker-compose logs -f better-smokeping

# 手動部署
pm2 logs monitor  # 如果使用 PM2
```

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

1. Fork 這個倉庫
2. 創建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟一個 Pull Request

## 📄 授權

本項目採用 MIT 授權 - 查看 [LICENSE](LICENSE) 文件了解詳情。

## 🙏 致謝

- [Next.js](https://nextjs.org/) - React 全端框架
- [Prisma](https://www.prisma.io/) - 現代化 ORM
- [Recharts](https://recharts.org/) - React 圖表庫
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [shadcn/ui](https://ui.shadcn.com/) - UI 組件庫
- [Smokeping](https://oss.oetiker.ch/smokeping/) - 原始靈感來源

## 📞 支援

如有問題或建議，請：
- 開啟 [GitHub Issue](https://github.com/yourusername/better-smokeping/issues)
- 發送郵件至：your-email@example.com

---

Made with ❤️ for network monitoring

# Debian 12 部署指南

## 🐧 在 Debian 12 上部署 Better Smokeping

本指南專門為 Debian 12 用戶編寫，提供詳細的部署步驟。

## 方式一：使用 Docker（強烈推薦）

### 1. 準備系統

```bash
# 更新系統
sudo apt update
sudo apt upgrade -y

# 安裝必要工具
sudo apt install -y git curl
```

### 2. 安裝 Docker 和 Docker Compose

```bash
# 安裝 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 將當前用戶添加到 docker 組（可選，避免每次都用 sudo）
sudo usermod -aG docker $USER
newgrp docker

# 安裝 Docker Compose
sudo apt install -y docker-compose

# 驗證安裝
docker --version
docker-compose --version
```

### 3. 克隆項目

```bash
# 克隆倉庫
git clone https://github.com/yourusername/better-smokeping.git
cd better-smokeping
```

### 4. 配置環境變數（可選）

```bash
# 複製環境變數範例文件
cp .env.example .env

# 根據需要編輯配置
nano .env
```

可配置的選項：
```env
DATABASE_URL="file:./prisma/smokeping.db"
PING_INTERVAL=60000      # 監測間隔（毫秒）
PING_COUNT=10            # 每次 ping 的數量
PING_TIMEOUT=2000        # 超時時間（毫秒）
```

### 5. 啟動服務

```bash
# 使用 Docker Compose 啟動
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

### 6. 訪問界面

在瀏覽器中訪問：
```
http://你的服務器IP:3000
```

例如：`http://192.168.1.100:3000`

### 常用 Docker 命令

```bash
# 查看日誌
docker-compose logs -f

# 重啟服務
docker-compose restart

# 停止服務
docker-compose down

# 停止並刪除數據
docker-compose down -v

# 更新應用
git pull
docker-compose build
docker-compose up -d

# 進入容器
docker-compose exec better-smokeping sh
```

## 方式二：手動部署

### 1. 安裝 Node.js 20

```bash
# 安裝 Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 驗證安裝
node -v  # 應該顯示 v20.x.x
npm -v
```

### 2. 安裝系統依賴

```bash
# 安裝 ping 和 traceroute 工具
sudo apt install -y iputils-ping traceroute
```

### 3. 克隆和設置項目

```bash
# 克隆倉庫
git clone https://github.com/yourusername/better-smokeping.git
cd better-smokeping

# 安裝依賴
npm install

# 初始化資料庫
npx prisma db push

# （可選）添加默認監測目標
npm run db:seed

# 構建應用
npm run build
```

### 4. 使用 PM2 管理進程

```bash
# 安裝 PM2
sudo npm install -g pm2

# 啟動 Web 服務器
pm2 start npm --name "smokeping-web" -- start

# 啟動監測服務
pm2 start scripts/monitor.js --name "smokeping-monitor"

# 查看狀態
pm2 status

# 查看日誌
pm2 logs

# 設置開機自啟
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
pm2 save
```

### 5. 配置防火牆（可選）

```bash
# 如果使用 UFW
sudo ufw allow 3000/tcp
sudo ufw reload

# 如果使用 iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

### PM2 常用命令

```bash
# 查看狀態
pm2 status

# 查看日誌
pm2 logs

# 只查看某個服務的日誌
pm2 logs smokeping-web
pm2 logs smokeping-monitor

# 重啟服務
pm2 restart all
pm2 restart smokeping-web

# 停止服務
pm2 stop all
pm2 stop smokeping-web

# 刪除服務
pm2 delete all

# 監控
pm2 monit
```

## 配置 Nginx 反向代理（推薦）

如果你想使用域名訪問，或者配置 HTTPS，可以使用 Nginx 作為反向代理。

### 1. 安裝 Nginx

```bash
sudo apt install -y nginx
```

### 2. 創建配置文件

```bash
sudo nano /etc/nginx/sites-available/smokeping
```

添加以下內容：

```nginx
server {
    listen 80;
    server_name smokeping.yourdomain.com;  # 改成你的域名

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. 啟用網站

```bash
# 創建軟連接
sudo ln -s /etc/nginx/sites-available/smokeping /etc/nginx/sites-enabled/

# 測試配置
sudo nginx -t

# 重新載入 Nginx
sudo systemctl reload nginx
```

### 4. 配置 HTTPS（使用 Let's Encrypt）

```bash
# 安裝 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 獲取 SSL 證書
sudo certbot --nginx -d smokeping.yourdomain.com

# Certbot 會自動配置 HTTPS 並設置自動續期
```

## 故障排除

### Docker 無法 ping

如果在 Docker 容器中無法 ping，確保容器有必要的網路權限：

```yaml
# docker-compose.yml
services:
  better-smokeping:
    cap_add:
      - NET_RAW
      - NET_ADMIN
```

### 端口被占用

如果 3000 端口已被占用，修改 `docker-compose.yml`：

```yaml
ports:
  - "8080:3000"  # 改成其他端口
```

或在 `.env` 中設置：
```env
PORT=8080
```

### 資料庫權限錯誤

```bash
# 對於 Docker
docker-compose down -v
docker-compose up -d

# 對於手動部署
rm -rf prisma/smokeping.db
npx prisma db push
```

### 查看詳細錯誤

```bash
# Docker
docker-compose logs -f better-smokeping

# PM2
pm2 logs --lines 100
```

### 監測服務沒有收集數據

檢查監測服務是否正在運行：

```bash
# Docker
docker-compose logs -f | grep "Monitoring"

# PM2
pm2 logs smokeping-monitor
```

## 性能優化

### 1. 調整監測間隔

在 `.env` 中設置：
```env
PING_INTERVAL=30000  # 30秒一次（更頻繁）
# 或
PING_INTERVAL=300000 # 5分鐘一次（較少）
```

### 2. 數據清理

默認會自動刪除 30 天前的數據。如需調整，修改 `scripts/monitor.js`。

### 3. 限制 Docker 資源

在 `docker-compose.yml` 中：

```yaml
services:
  better-smokeping:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

## 備份和恢復

### 備份資料庫

```bash
# Docker
docker-compose exec better-smokeping cp /app/prisma/smokeping.db /app/data/backup.db

# 手動部署
cp prisma/smokeping.db prisma/backup.db
```

### 自動備份腳本

創建 `/usr/local/bin/backup-smokeping.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/smokeping"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp /path/to/better-smokeping/prisma/smokeping.db $BACKUP_DIR/smokeping_$DATE.db

# 保留最近 7 天的備份
find $BACKUP_DIR -name "smokeping_*.db" -mtime +7 -delete
```

設置 cron 每天備份：
```bash
sudo crontab -e

# 添加
0 2 * * * /usr/local/bin/backup-smokeping.sh
```

## 更新應用

### Docker 部署更新

```bash
cd better-smokeping
git pull
docker-compose build
docker-compose up -d
```

### 手動部署更新

```bash
cd better-smokeping
git pull
npm install
npm run build
pm2 restart all
```

## 卸載

### Docker 部署

```bash
cd better-smokeping
docker-compose down -v
cd ..
rm -rf better-smokeping
```

### 手動部署

```bash
pm2 delete all
pm2 save
cd ..
rm -rf better-smokeping
```

## 獲取幫助

- GitHub Issues: https://github.com/yourusername/better-smokeping/issues
- 完整文檔: [README.md](README.md)
- 快速入門: [QUICKSTART.md](QUICKSTART.md)

---

祝你部署順利！🚀

# 快速入門指南

## 🚀 在 Debian 系統上快速部署

### 方式一：使用 Docker（推薦）

1. **安裝 Docker 和 Docker Compose**

```bash
# 更新系統
sudo apt update

# 安裝 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安裝 Docker Compose
sudo apt install docker-compose

# 將當前用戶添加到 docker 組
sudo usermod -aG docker $USER
newgrp docker
```

2. **部署 Better Smokeping**

```bash
# 克隆倉庫
git clone https://github.com/yourusername/better-smokeping.git
cd better-smokeping

# 啟動服務
docker-compose up -d

# 查看日誌
docker-compose logs -f
```

3. **訪問界面**

打開瀏覽器訪問：`http://your-server-ip:3000`

### 方式二：手動部署

1. **安裝 Node.js 20**

```bash
# 安裝 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安裝必要工具
sudo apt install -y iputils-ping traceroute
```

2. **部署應用**

```bash
# 克隆倉庫
git clone https://github.com/yourusername/better-smokeping.git
cd better-smokeping

# 安裝依賴
npm install

# 初始化資料庫
npx prisma db push

# 構建應用
npm run build
```

3. **使用 PM2 管理服務**

```bash
# 安裝 PM2
sudo npm install -g pm2

# 啟動 Web 服務器
pm2 start npm --name "better-smokeping-web" -- start

# 啟動監測服務
pm2 start scripts/monitor.js --name "better-smokeping-monitor"

# 設置開機自啟
pm2 startup
pm2 save
```

4. **訪問界面**

打開瀏覽器訪問：`http://your-server-ip:3000`

## ⚙️ 配置反向代理（可選）

### 使用 Nginx

1. **安裝 Nginx**

```bash
sudo apt install nginx
```

2. **創建配置文件**

```bash
sudo nano /etc/nginx/sites-available/smokeping
```

添加以下內容：

```nginx
server {
    listen 80;
    server_name your-domain.com;

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

3. **啟用網站**

```bash
sudo ln -s /etc/nginx/sites-available/smokeping /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. **配置 HTTPS（推薦）**

```bash
# 安裝 Certbot
sudo apt install certbot python3-certbot-nginx

# 獲取 SSL 證書
sudo certbot --nginx -d your-domain.com
```

## 📝 初始配置

1. **訪問 Web 界面**
2. **添加第一個監測目標**
   - 點擊 "Add Target"
   - 名稱：Google DNS
   - 主機：8.8.8.8
   - 描述：Google Public DNS
   - 分組：Public DNS
3. **等待數據收集**（約 1-2 分鐘）
4. **查看圖表和統計資訊**

## 🔧 常用命令

### Docker 部署

```bash
# 查看日誌
docker-compose logs -f

# 重啟服務
docker-compose restart

# 停止服務
docker-compose down

# 更新服務
git pull
docker-compose build
docker-compose up -d
```

### PM2 部署

```bash
# 查看狀態
pm2 status

# 查看日誌
pm2 logs

# 重啟服務
pm2 restart all

# 停止服務
pm2 stop all

# 更新服務
git pull
npm install
npm run build
pm2 restart all
```

## 🐛 常見問題

### Q: 無法 ping 目標
A: 確保系統有 `iputils-ping` 包，Docker 用戶需要確保容器有 `NET_RAW` 權限。

### Q: 資料庫錯誤
A: 刪除 `prisma/smokeping.db` 並重新運行 `npx prisma db push`

### Q: 端口被占用
A: 修改 `docker-compose.yml` 或在 `.env` 中設置不同的端口

### Q: 監測服務沒有收集數據
A: 檢查監測服務是否正在運行：
- Docker: `docker-compose logs -f`
- PM2: `pm2 logs better-smokeping-monitor`

## 📞 獲取幫助

- GitHub Issues: https://github.com/yourusername/better-smokeping/issues
- 完整文檔: [README.md](README.md)

---

祝你使用愉快！

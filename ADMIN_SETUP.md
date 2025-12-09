# 管理員系統設置指南

## 🔒 新增功能

1. **管理員認證系統** - 需要登錄才能管理監測目標
2. **深色主題** - 默認啟用深色模式
3. **權限控制** - 只有管理員可以添加/編輯/刪除目標

## 📝 部署步驟

### 1. 更新代碼

```bash
cd ~/better-smokeping
git pull
```

### 2. 停止並清理舊容器

```bash
docker-compose down -v
docker system prune -f
```

### 3. 重新構建（不使用緩存）

```bash
docker-compose build --no-cache
```

### 4. 啟動服務

```bash
docker-compose up -d
```

### 5. 查看日誌確認啟動成功

```bash
docker-compose logs -f
```

你應該會看到：
```
better-smokeping    | Starting Better Smokeping...
better-smokeping    | Initializing database...
better-smokeping    | ✅ Your database is now in sync with your Prisma schema.
better-smokeping    | Starting monitoring service...
better-smokeping    | Starting web server on port 3000...
better-smokeping    | ✓ Ready in XXXms
```

### 6. 創建管理員賬號

```bash
# 進入容器
docker-compose exec better-smokeping sh

# 創建管理員（替換 admin 和 yourpassword）
node scripts/create-admin.js admin yourpassword

# 退出容器
exit
```

你會看到：
```
✅ Admin user created successfully!
   Username: admin
   ID: 1

🔐 You can now login at: http://your-server:3000/admin/login
```

## 🌐 使用方式

### 公開訪問（查看監測數據）

訪問：`http://your-server-ip:3000`

- 可以查看所有監測圖表
- 可以選擇不同的監測目標
- 可以查看 traceroute 結果
- **無法添加/編輯/刪除目標**

### 管理員登錄

訪問：`http://your-server-ip:3000/admin/login`

1. 輸入用戶名和密碼
2. 登錄成功後會跳轉到管理面板
3. 在管理面板可以：
   - 添加新的監測目標
   - 編輯現有目標
   - 刪除目標
   - 啟用/停用目標

## 🔐 安全建議

### 1. 更改默認密碼

首次部署後，立即更改管理員密碼：

```bash
docker-compose exec better-smokeping sh
node scripts/create-admin.js newadmin newstrongpassword
exit
```

### 2. 設置強密碼

- 至少 12 個字符
- 包含大小寫字母、數字和特殊字符
- 不要使用常見密碼

### 3. 設置 JWT 密鑰

在 `.env` 文件中添加：

```env
JWT_SECRET=your-very-secure-random-string-here
```

生成隨機密鑰：
```bash
openssl rand -base64 32
```

### 4. 啟用 HTTPS

使用 Nginx 反向代理並配置 SSL 證書（參考 DEBIAN_DEPLOYMENT.md）

### 5. 限制訪問

使用防火牆限制只允許特定 IP 訪問 `/admin` 路徑

## 🎨 主題說明

系統現在默認使用**深色主題**：

- 深色背景更護眼
- 藍色主色調
- 優化的對比度
- 所有頁面統一風格

## 📋 API 權限

現在的 API 權限設置：

### 公開 API（無需認證）
- `GET /api/targets` - 查看所有目標
- `GET /api/targets/[id]` - 查看單個目標
- `GET /api/ping/[id]` - 查看 ping 結果
- `GET /api/traceroute/[id]` - 查看 traceroute 結果
- `GET /api/statistics/[id]` - 查看統計數據
- `POST /api/ping/[id]` - 執行 ping（暫時公開）
- `POST /api/traceroute/[id]` - 執行 traceroute（暫時公開）

### 需要認證的 API（管理員專用）
- `POST /api/targets` - 創建目標
- `PATCH /api/targets/[id]` - 更新目標
- `DELETE /api/targets/[id]` - 刪除目標

## 🔧 故障排除

### 問題：無法登錄

1. 確認管理員賬號已創建：
```bash
docker-compose exec better-smokeping sh
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.admin.findMany().then(console.log).finally(() => prisma.\$disconnect())"
```

2. 重新創建管理員：
```bash
docker-compose exec better-smokeping sh
node scripts/create-admin.js admin newpassword
```

### 問題：Prisma 錯誤

如果看到 "Query Engine" 錯誤：

```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### 問題：無法連接到服務器

1. 檢查容器狀態：
```bash
docker-compose ps
```

2. 查看詳細日誌：
```bash
docker-compose logs --tail=100 better-smokeping
```

3. 測試端口：
```bash
curl http://localhost:3000
```

## 📱 移動端訪問

深色主題在移動設備上也能正常使用，響應式設計確保在手機和平板上都有良好的體驗。

## 🆕 新增命令

```bash
# 創建管理員
docker-compose exec better-smokeping node scripts/create-admin.js <username> <password>

# 查看所有管理員
docker-compose exec better-smokeping node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.admin.findMany().then(admins => console.log(admins)).finally(() => prisma.\$disconnect())"

# 重置數據庫（危險！）
docker-compose down -v
docker-compose up -d
```

---

**注意**：首次部署後請立即創建管理員賬號並妥善保管密碼！

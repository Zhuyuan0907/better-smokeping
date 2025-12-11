# Docker 使用說明

## 開發環境（推薦用於開發時）

開發環境使用 volume mount，修改代碼後**不需要重新構建**，自動熱重載。

### 首次啟動

```bash
# 使用開發配置構建
docker-compose -f docker-compose.dev.yml build

# 啟動容器
docker-compose -f docker-compose.dev.yml up -d

# 查看日誌
docker-compose -f docker-compose.dev.yml logs -f
```

### 修改代碼後

修改 `app/`, `components/`, `lib/` 等目錄下的代碼後，**不需要重新構建**，Next.js 會自動熱重載。

只需要在以下情況重新構建：
- 修改了 `package.json`（添加/刪除依賴）
- 修改了 `prisma/schema.prisma`
- 修改了 `Dockerfile.dev`

```bash
# 重新構建
docker-compose -f docker-compose.dev.yml build

# 重啟容器
docker-compose -f docker-compose.dev.yml restart
```

### 停止和清理

```bash
# 停止容器
docker-compose -f docker-compose.dev.yml down

# 停止並刪除數據（慎用！）
docker-compose -f docker-compose.dev.yml down -v
```

---

## 生產環境

生產環境使用優化的多階段構建，體積更小，啟動更快。

### 構建和啟動

```bash
# 構建生產鏡像
docker-compose build

# 啟動容器
docker-compose up -d

# 查看日誌
docker-compose logs -f
```

### 更新代碼

修改代碼後需要重新構建：

```bash
# 停止容器
docker-compose down

# 重新構建
docker-compose build

# 啟動
docker-compose up -d
```

---

## 常用命令

### 進入容器

```bash
# 開發環境
docker exec -it better-smokeping-dev sh

# 生產環境
docker exec -it better-smokeping sh
```

### 查看數據庫

```bash
# 進入容器
docker exec -it better-smokeping sh

# 查看數據
cd /app
npx prisma studio
```

### 清空 MTR 數據

```bash
docker exec -it better-smokeping sh -c "cd /app && npx prisma db execute --stdin" <<< "DELETE FROM TracerouteResult;"
```

### 查看監控日誌

```bash
# 開發環境
docker-compose -f docker-compose.dev.yml logs -f better-smokeping

# 生產環境
docker-compose logs -f better-smokeping
```

---

## 構建優化說明

### 開發環境優化
- 使用 volume mount，代碼變更即時生效
- 不需要重新構建（除非依賴變更）
- 適合快速開發和測試

### 生產環境優化
- 多階段構建，只保留必要文件
- `npm ci --only=production` 只安裝生產依賴
- 清理 npm cache 減少鏡像體積
- 使用 `.dockerignore` 排除不必要文件

### 構建時間對比
- **開發環境首次構建**: ~2-3 分鐘
- **開發環境修改代碼**: 0 秒（無需重建）
- **生產環境構建**: ~3-5 分鐘（包含完整優化）

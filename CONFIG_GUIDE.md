# 配置指南

## 📝 簡介

Better Smokeping 使用簡單的 JSON 配置文件來管理監測目標，就像傳統的 Smokeping 配置一樣。

不需要登錄系統，只需要編輯 `config/targets.json` 文件，然後重啟服務即可。

## 📁 配置文件位置

```
config/targets.json
```

## 📋 配置格式

```json
{
  "targets": [
    {
      "name": "目標名稱",
      "host": "主機名或 IP",
      "description": "可選的描述",
      "group": "分組名稱",
      "enabled": true
    }
  ]
}
```

### 字段說明

- **name** (必填): 目標的唯一名稱
- **host** (必填): 要監測的主機名或 IP 地址
- **description** (可選): 目標的描述信息
- **group** (可選): 分組名稱，用於在界面上分類顯示（默認: "default"）
- **enabled** (可選): 是否啟用監測（默認: true）

## ✏️ 編輯配置

### 方式一：直接編輯（推薦）

```bash
# 編輯配置文件
nano config/targets.json

# 或使用 vim
vim config/targets.json
```

### 方式二：在容器內編輯

```bash
# 進入容器
docker-compose exec better-smokeping sh

# 編輯配置
vi /app/config/targets.json

# 退出容器
exit
```

## 🔄 應用配置

編輯完配置文件後，有兩種方式應用：

### 方式一：重啟服務（簡單）

```bash
docker-compose restart
```

### 方式二：手動同步（不中斷服務）

```bash
docker-compose exec better-smokeping node scripts/sync-config.js
```

## 📖 配置範例

### 範例 1：基本配置

```json
{
  "targets": [
    {
      "name": "Google DNS",
      "host": "8.8.8.8",
      "description": "Google Public DNS",
      "group": "DNS Servers"
    }
  ]
}
```

### 範例 2：多個目標

```json
{
  "targets": [
    {
      "name": "Google DNS",
      "host": "8.8.8.8",
      "description": "Google Public DNS",
      "group": "DNS Servers",
      "enabled": true
    },
    {
      "name": "Cloudflare DNS",
      "host": "1.1.1.1",
      "description": "Cloudflare Public DNS",
      "group": "DNS Servers",
      "enabled": true
    },
    {
      "name": "HiNet DNS",
      "host": "168.95.1.1",
      "description": "中華電信 DNS",
      "group": "台灣 DNS",
      "enabled": true
    }
  ]
}
```

### 範例 3：停用某個目標

```json
{
  "targets": [
    {
      "name": "測試服務器",
      "host": "192.168.1.100",
      "description": "暫時停用的測試服務器",
      "group": "本地網路",
      "enabled": false
    }
  ]
}
```

## 🎯 預設配置

系統包含以下預設監測目標：

### DNS 服務器
- Google DNS (8.8.8.8)
- Cloudflare DNS (1.1.1.1)
- Quad9 DNS (9.9.9.9)

### 台灣 DNS
- HiNet DNS (168.95.1.1)
- HiNet DNS 2 (168.95.192.1)

### 網站
- Google (google.com)
- Facebook (facebook.com)
- Yahoo Taiwan (tw.yahoo.com)

### 開發工具
- GitHub (github.com)

### 本地網路
- 本地網關 (192.168.1.1) - 默認停用

## ⚠️ 注意事項

1. **JSON 格式**: 確保 JSON 格式正確，使用在線 JSON 驗證器檢查
2. **唯一名稱**: 每個目標的 `name` 必須唯一
3. **有效主機**: `host` 必須是可以 ping 通的主機名或 IP
4. **重啟生效**: 編輯後需要重啟服務才會生效
5. **備份配置**: 修改前建議備份 `config/targets.json`

## 🔧 常見操作

### 添加新目標

1. 編輯 `config/targets.json`
2. 在 `targets` 數組中添加新對象：

```json
{
  "name": "我的服務器",
  "host": "example.com",
  "description": "我的網站服務器",
  "group": "我的服務",
  "enabled": true
}
```

3. 保存文件
4. 重啟服務：`docker-compose restart`

### 修改現有目標

1. 找到要修改的目標
2. 修改相應字段
3. 保存並重啟

### 刪除目標

1. 從 `targets` 數組中刪除對應的對象
2. 或將 `enabled` 設為 `false`（保留配置但停用）
3. 保存並重啟

### 分組管理

使用 `group` 字段對目標進行分類：

```json
{
  "targets": [
    {
      "name": "生產服務器 1",
      "host": "prod1.example.com",
      "group": "生產環境"
    },
    {
      "name": "測試服務器 1",
      "host": "test1.example.com",
      "group": "測試環境"
    }
  ]
}
```

## 🐛 故障排除

### 配置沒有生效

```bash
# 檢查配置文件是否正確
cat config/targets.json

# 手動同步
docker-compose exec better-smokeping node scripts/sync-config.js

# 重啟服務
docker-compose restart
```

### JSON 格式錯誤

使用在線工具驗證：https://jsonlint.com/

或在容器中檢查：
```bash
docker-compose exec better-smokeping node -e "console.log(JSON.parse(require('fs').readFileSync('/app/config/targets.json', 'utf-8')))"
```

### 查看當前配置

```bash
# 查看配置文件
docker-compose exec better-smokeping cat /app/config/targets.json

# 查看數據庫中的目標
docker-compose exec better-smokeping node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.target.findMany().then(console.log).finally(() => prisma.\$disconnect())"
```

## 💡 最佳實踐

1. **分組命名**: 使用有意義的分組名稱
2. **描述清晰**: 添加詳細的描述信息
3. **定期審查**: 定期檢查和更新配置
4. **備份配置**: 在修改前備份配置文件
5. **測試變更**: 小批量修改並測試

## 📞 獲取幫助

- 查看完整文檔：[README.md](README.md)
- 部署指南：[DEBIAN_DEPLOYMENT.md](DEBIAN_DEPLOYMENT.md)

---

**簡單、直接、無需登錄！**

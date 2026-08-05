# PMS

## Deploy

生产机：`pms-server`（`ssh admin@10.200.100.160`，再 `sudo -i`）  
线上：https://pms.yechtech.com/v2/  
Nginx：`/v2/` → 静态目录，`/api/` → 本机 `8082`

### 前端（本仓库）

```bash
# 本地
pnpm build

# 服务器（先备份再覆盖）
cp -a /data/pms/web/v2/dist /data/pms/web/v2/dist.bak.$(date +%Y%m%d%H%M%S)
# 把本地 dist/ 同步到服务器 /tmp/pms-web-v2-dist/ 后：
find /data/pms/web/v2/dist -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -a /tmp/pms-web-v2-dist/. /data/pms/web/v2/dist/
```

路径：`/data/pms/web/v2/dist/`。静态替换即可，一般不用 reload nginx。

### 后端（`../pms-api`）

```bash
# 本地
mvn clean package -DskipTests

# 服务器（先备份再覆盖；系统 cp 可能是别名，用 /bin/cp）
cp -a /data/pms/api/pms-api.jar /data/pms/api/bak/pms-api$(date +%Y%m%d%H%M%S).jar
/bin/cp -f /tmp/pms-api-new.jar /data/pms/api/pms-api.jar
systemctl restart pms-api
systemctl status pms-api
```

路径：`/data/pms/api/pms-api.jar`，服务：`pms-api.service`，端口 `8082`。

### 检查

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1/v2/
curl -s -X POST http://127.0.0.1/api/login -H 'Content-Type: application/json' -d '{}'
```

### 回滚

```bash
# 前端
rm -rf /data/pms/web/v2/dist && cp -a /data/pms/web/v2/dist.bak.<TS> /data/pms/web/v2/dist

# 后端
/bin/cp -f /data/pms/api/bak/pms-api<TS>.jar /data/pms/api/pms-api.jar
systemctl restart pms-api
```

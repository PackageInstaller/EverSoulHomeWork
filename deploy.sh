#!/bin/bash
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔄 开始部署流程...${NC}"

# 1. 应用数据库迁移
echo -e "${YELLOW}📊 应用数据库迁移...${NC}"
npx prisma migrate deploy || {
    echo -e "${YELLOW}⚠️  migrate deploy 失败，尝试 db push...${NC}"
    npx prisma db push --skip-generate || {
        echo -e "${RED}❌ 数据库同步失败${NC}"
        exit 1
    }
}

# 2. 重新生成 Prisma 客户端
echo -e "${YELLOW}🔄 重新生成 Prisma 客户端...${NC}"
npx prisma generate

# 3. 构建应用
echo -e "${YELLOW}🏗️  构建应用...${NC}"
export NEXT_PUBLIC_ENABLE_CONSOLE=true
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 构建成功${NC}"
    echo -e "${YELLOW}🔄 重启 PM2${NC}"
    pm2 reload ecosystem.config.js --update-env
    if [ $? -ne 0 ]; then
        pm2 start ecosystem.config.js
    fi
    echo -e "${GREEN}✅ 部署完成${NC}"
    pm2 log
else
    echo -e "${RED}❌ 构建失败${NC}"
    exit 1
fi


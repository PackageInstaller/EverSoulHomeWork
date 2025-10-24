#!/bin/bash
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
export NEXT_PUBLIC_ENABLE_CONSOLE=true
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}构建成功${NC}"
    echo -e "${YELLOW}重启 PM2${NC}"
    pm2 reload ecosystem.config.js --update-env
    if [ $? -ne 0 ]; then
        pm2 start ecosystem.config.js
        pm2 monit
    fi
else
    echo -e "${RED}构建失败${NC}"
    exit 1
fi


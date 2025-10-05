#!/bin/bash

echo "🚀 开始部署Gzip压缩优化..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 备份旧缓存（如果需要）
if [ -d "data-cache" ] && [ "$(ls -A data-cache)" ]; then
  echo -e "${YELLOW}📦 备份旧缓存...${NC}"
  tar -czf "data-cache-backup-$(date +%Y%m%d-%H%M%S).tar.gz" data-cache/ 2>/dev/null || true
fi

# 2. 删除旧缓存（格式已改变，必须清理）
echo -e "${YELLOW}🗑️  清理旧缓存文件...${NC}"
rm -rf data-cache/*
echo -e "${GREEN}✅ 旧缓存已清理${NC}"

# 3. 删除 .next 构建缓存
echo -e "${YELLOW}🧹 清理构建缓存...${NC}"
rm -rf .next
echo -e "${GREEN}✅ 构建缓存已清理${NC}"

# 4. 重新安装依赖（确保zlib可用）
echo -e "${YELLOW}📦 检查依赖...${NC}"
npm install

# 5. 重新构建
echo -e "${YELLOW}🔨 重新构建项目...${NC}"
npm run build

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ 构建成功${NC}"
else
  echo -e "${RED}❌ 构建失败，请检查错误${NC}"
  exit 1
fi

# 6. 重启服务
echo -e "${YELLOW}🔄 重启服务...${NC}"
if command -v pm2 &> /dev/null; then
  pm2 restart npm
  echo -e "${GREEN}✅ 服务已重启（PM2）${NC}"
else
  echo -e "${YELLOW}⚠️  未检测到PM2，请手动重启服务${NC}"
fi

# 7. 显示下一步操作
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📋 下一步操作：${NC}"
echo "1. 访问管理后台: http://your-server:3000/admin"
echo "2. 点击 '缓存管理' → '更新所有数据'"
echo "3. 等待缓存下载并压缩（会看到压缩比例日志）"
echo "4. 刷新前端页面，查看加载速度"
echo ""
echo -e "${YELLOW}📊 验证压缩效果：${NC}"
echo "  ls -lh data-cache/*.gz | head -5"
echo "  du -sh data-cache/"
echo ""
echo -e "${YELLOW}📝 查看日志：${NC}"
echo "  pm2 logs npm | grep FileCache"
echo ""
echo -e "${YELLOW}🔍 预期效果：${NC}"
echo "  - 缓存文件：*.json.gz 格式"
echo "  - 总大小：约 6-8 MB（之前 20+ MB）"
echo "  - 加载速度：0.5-1秒（之前 3-8秒）"
echo ""

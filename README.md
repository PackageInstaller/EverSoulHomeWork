# EverSoul 作业管理系统

一个用于管理 EverSoul 游戏攻略作业的 Web 应用。

## ✨ 功能特性

- 📝 **作业管理** - 上传、审核、查看关卡作业
- 💎 **积分系统** - 作业积分排行榜，每月结算
- 🎯 **关卡详情** - 详细的关卡信息、掉落物、阵容推荐
- 🔐 **管理后台** - 作业审核、批量操作、积分结算

## 🚀 快速开始

### 首次部署

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库
node scripts/init-db.js

# 3. 构建项目
npm run build

# 4. 启动服务
npm start
```

访问 [http://localhost:3000](http://localhost:3000)

### 开发环境

```bash
npm install
node scripts/init-db.js
npm run dev
```

📖 **详细启动指南**：[QUICK_START.md](./QUICK_START.md)

## 📦 技术栈

- **框架**: Next.js 14
- **数据库**: Prisma + SQLite
- **样式**: Tailwind CSS
- **图表**: Recharts
- **数据源**: GitHub (CDN加速)

## 🎯 缓存机制

使用**纯内存缓存**，配合CDN加速：
- 从 CDN 下载游戏数据
- 缓存在内存中
- 重启后自动重新加载

详见：
- 📄 [RESTORE_OLD_CACHE.md](./RESTORE_OLD_CACHE.md) - 缓存机制说明
- 📄 [CLEANUP_GUIDE.md](./CLEANUP_GUIDE.md) - 项目清理优化指南

## 📁 项目结构

```
src/
├── app/              # Next.js 页面和路由
│   ├── api/          # API 路由
│   │   ├── admin/    # 管理API（认证、作业管理、迁移）
│   │   ├── homework/ # 作业API（查询、上传）
│   │   └── points/   # 积分API（排行榜、结算）
│   ├── admin/        # 管理后台页面
│   ├── stage/        # 关卡页面
│   └── page.tsx      # 首页
├── components/       # React 组件（10个）
├── lib/              # 工具库（迁移、积分、自动结算）
├── types/            # TypeScript 类型定义
└── utils/            # 工具函数
    ├── dataUtils.ts      # 数据获取和内存缓存
    └── backgroundUtils.ts # 背景工具

prisma/
└── schema.prisma     # 数据库Schema（7个表）

scripts/
├── check-db.js               # 数据库检查
├── cleanup-old-tables.js     # 清理旧表
├── post-deploy.js            # 部署脚本
└── vacuum-db.js              # 数据库优化
```

## 🔧 管理员密码

编辑 `src/config/admin-password.ts` 设置管理员密码。

## 📊 积分系统

- 单队图：0.1 分
- 双队图：0.5 分
- 三队图：1 分
- 有作业的图按减半计算
- 每月自动结算

## 🌐 部署

### 使用 PM2

```bash
npm run build
pm2 start npm --name "eversoul" -- start
```

### 环境变量

创建 `.env` 文件：
```env
DATABASE_URL="file:./prisma/dev.db"
```

## 📝 License

MIT

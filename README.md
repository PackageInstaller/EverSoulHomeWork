# EverSoul 作业管理系统

一个用于管理 EverSoul 游戏攻略作业的 Web 应用。

## ✨ 功能特性

- 👤 **用户系统** - 注册、登录、个人资料管理（JWT认证）
- 📝 **作业管理** - 上传、审核、查看关卡作业（需登录）
- 💎 **积分系统** - 月度排行榜、总积分排行、自动结算
- 📬 **消息系统** - 系统通知、管理员消息、作业审核通知
- 🎯 **关卡详情** - 详细信息、掉落物、阵容推荐、快捷导航
- 🔐 **管理后台** - 作业审核、批量操作、消息发送、积分结算

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
- **认证**: JWT + bcryptjs
- **数据源**: GitHub (CDN 加速)

## 🎯 缓存机制

使用**纯内存缓存**，配合 CDN 加速：

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
└── schema.prisma     # 数据库Schema（8个表）
    ├── User              # 用户表
    ├── UserHomework      # 作业表
    ├── HomeworkImage     # 作业图片表
    ├── UserPoints        # 用户积分表
    ├── MonthlyPrizePool  # 月度奖池表
    ├── SystemConfig      # 系统配置表
    └── Message           # 消息表

scripts/
├── check-db.js               # 数据库检查
├── cleanup-old-tables.js     # 清理旧表
├── post-deploy.js            # 部署脚本
└── vacuum-db.js              # 数据库优化
```

## 📡 API 文档

### 用户认证 API

#### `POST /api/user/register`
用户注册
- **Body**: `{ email, password, nickname }`
- **Response**: `{ success, token, user }`

#### `POST /api/user/login`
用户登录
- **Body**: `{ email, password }`
- **Response**: `{ success, token }`

#### `GET /api/user/profile`
获取用户信息
- **Headers**: `Authorization: Bearer {token}`
- **Response**: `{ success, user }`

#### `PATCH /api/user/profile`
更新用户信息
- **Headers**: `Authorization: Bearer {token}`
- **Body**: `{ nickname?, oldPassword?, newPassword? }`
- **Response**: `{ success, token?, user }`

### 作业 API

#### `GET /api/homework/[stageId]`
获取关卡作业列表
- **Response**: `{ success, homeworks[], pagination }`

#### `POST /api/homework/upload`
上传作业（需登录）
- **Headers**: `Authorization: Bearer {token}`
- **Body**: FormData (images, stageId, nickname, description, teamCount)
- **Response**: `{ success, homework }`

#### `GET /api/homework/by-user`
查询用户作业
- **Query**: `nickname`
- **Response**: `{ success, homeworks[] }`

### 积分 API

#### `GET /api/points/leaderboard`
月度积分排行榜
- **Query**: `yearMonth`
- **Response**: `{ success, leaderboard[], prizePool }`

#### `GET /api/points/total-rank`
总积分排行
- **Query**: `search?, page?, limit?`
- **Response**: `{ success, ranks[], stats, pagination }`

#### `GET /api/points/months`
获取有积分的月份列表
- **Response**: `{ success, months[] }`

#### `GET /api/points/history`
积分历史记录
- **Query**: `nickname`
- **Response**: `{ success, history[] }`

### 消息 API

#### `GET /api/messages`
获取用户消息（需登录）
- **Headers**: `Authorization: Bearer {token}`
- **Query**: `type?` (all/unread/read/system/admin)
- **Response**: `{ success, messages[], unreadCount }`

#### `PATCH /api/messages/[id]`
标记消息已读（需登录）
- **Headers**: `Authorization: Bearer {token}`
- **Response**: `{ success }`

#### `DELETE /api/messages/[id]`
删除消息（需登录）
- **Headers**: `Authorization: Bearer {token}`
- **Response**: `{ success }`

### 管理员 API

#### `POST /api/admin/auth`
管理员登录
- **Body**: `{ password }`
- **Response**: `{ success }` + Cookie

#### `GET /api/admin/auth`
检查管理员会话
- **Response**: `{ success, isAuthenticated }`

#### `DELETE /api/admin/auth`
管理员登出
- **Response**: `{ success }`

#### `GET /api/admin/homework`
获取作业列表
- **Cookie**: admin_session
- **Query**: `status?, page?, limit?`
- **Response**: `{ success, homeworks[], pagination }`

#### `PATCH /api/admin/homework/[id]`
更新作业状态
- **Cookie**: admin_session
- **Body**: `{ status, rejectReason? }`
- **Response**: `{ success, homework, pointsInfo? }`

#### `DELETE /api/admin/homework/[id]`
删除作业
- **Cookie**: admin_session
- **Response**: `{ success }`

#### `GET /api/admin/users`
获取用户列表
- **Cookie**: admin_session
- **Response**: `{ success, users[] }`

#### `POST /api/admin/messages/send`
发送消息给用户
- **Cookie**: admin_session
- **Body**: `{ userIds?, title, content, sendToAll? }`
- **Response**: `{ success, count }`

#### `POST /api/points/settle`
执行月度积分结算
- **Cookie**: admin_session
- **Body**: `{ yearMonth }`
- **Response**: `{ success, result }`

#### `POST /api/points/cancel-settlement`
取消月度结算
- **Cookie**: admin_session
- **Body**: `{ yearMonth }`
- **Response**: `{ success }`

#### `GET /api/points/base-pool`
获取基础奖池
- **Cookie**: admin_session
- **Response**: `{ success, basePool }`

#### `POST /api/points/base-pool`
更新基础奖池
- **Cookie**: admin_session
- **Body**: `{ basePool }`
- **Response**: `{ success }`

## 🔧 配置说明

### 管理员密码

首次启动时自动生成 `admin-secret.json`，包含：
- 随机生成的高强度管理员密码（16位）
- JWT密钥（自动生成）

可手动编辑此文件修改密码。

### 环境变量

创建 `.env` 文件：

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-key"  # 可选，优先于配置文件
```

## 📊 积分系统

### 积分规则

- 单队图：0.1 分
- 双队图：0.5 分
- 三队图：1 分
- 已有作业的关卡：分数减半
- 每月可结算一次

### 月度奖池

- 基础奖池：可在管理后台配置
- 总奖池 = 基础奖池 + 当月总积分
- 结算后按积分比例分配奖金

## 💾 数据库表结构

| 表名 | 说明 | 主要字段 |
|------|------|---------|
| User | 用户信息 | email, password, nickname |
| UserHomework | 作业提交 | stageId, nickname, status, images |
| HomeworkImage | 作业图片 | homeworkId, filename, order |
| UserPoints | 用户积分 | nickname, yearMonth, points |
| MonthlyPrizePool | 月度奖池 | yearMonth, totalPool, isSettled |
| SystemConfig | 系统配置 | key, value (base_prize_pool) |
| Message | 用户消息 | userId, type, title, content, isRead |

## 🌐 部署

### 使用 PM2

```bash
npm run build
pm2 start npm --name "eversoul" -- start
```

### 数据库迁移

```bash
# 开发环境
npx prisma migrate dev

# 生产环境
npx prisma migrate deploy
```

## 📝 License

MIT

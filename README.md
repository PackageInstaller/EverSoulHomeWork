# 🎮 EverSoul 攻略作业分享站

一个基于 Next.js 14 + TypeScript + Prisma 构建的 EverSoul 游戏攻略分享平台，支持玩家上传通关截图、管理员审核、多数据源切换等功能。

## ✨ 功能特性

### 🎯 核心功能

- **📊 关卡数据展示**

  - 支持正式服/测试服数据源切换
  - 详细的关卡信息（敌方阵容、战力、掉落率等）
  - 响应式关卡列表和章节导航
  - 关卡专属背景图片系统
- **📤 作业上传系统**

  - 用户友好的作业上传界面
  - 图片自动压缩优化（Sharp）
  - 支持多图片上传（根据队伍数量自动调整）
  - 输入内容安全过滤
- **🛡️ 管理员审核系统**

  - 安全的密码认证机制
  - 作业状态管理（待审核/通过/拒绝）
  - 批量选择和批量操作（通过/拒绝/删除）
  - 分页展示和智能筛选
  - 文件系统自动清理
  - 图片预览优化（关闭按钮位于右上角）
- **💎 积分排行榜系统**

  - 月度积分统计和排行
  - 19图及以上关卡积分奖励
  - 自动积分计算（单队0.1分，双队0.5分，三队1分）
  - 已有作业图自动减半积分
  - 月度奖池管理（基础200元 + 累加机制）
  - 三种奖励发放规则（1:1发放或按比例分配）
  - 自动结算配置（支持定时任务）
  - 结算历史查询和取消结算
  - 玩家作业详情查看（点击昵称查看所有作业）
- **🎨 用户体验**

  - 现代化 UI 设计（Tailwind CSS）
  - 暗色主题配色方案 + 精美背景图
  - 毛玻璃效果和动画交互
  - 移动端响应式适配
  - 快捷导航（返回主页按钮）
  - 玩家作业卡片展示和快速跳转



## 🚀 技术栈

### 前端技术

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript 5
- **样式**: Tailwind CSS 3
- **UI 组件**: Lucide React (图标)
- **状态管理**: React Hooks

### 后端技术

- **运行时**: Node.js
- **框架**: Next.js API Routes
- **数据库**: SQLite (Prisma ORM)
- **认证**: 自定义 JWT 会话
- **文件处理**: Sharp (图片压缩)

### 开发工具

- **代码质量**: ESLint + TypeScript
- **包管理**: npm
- **数据库迁移**: Prisma
- **构建工具**: Next.js 内置

## 📦 快速开始

### 环境要求

- Node.js 24+
- npm 11+

### 安装步骤

1. **克隆项目**

```bash
git clone https://github.com/PackageInstaller/EverSoulHomeWork
cd EverSoulHomeWork
```

2. **安装依赖**

```bash
npm install
npm run build
```

3. **数据库设置**

```bash
# 生成 Prisma 客户端
npx prisma generate

# 创建数据库和表结构
npx prisma db push
```

4. **配置管理员密码**

```bash
# 创建密码文件
echo "your_admin_password" > admin-secret.txt
```

5. **启动开发服务器**

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 生产部署

```bash
# 构建项目
npm run build

# 启动生产服务器
npm run start
# 或者推荐pm2启动
npm intall pm2
pm2 start npm -- start
```

## 📂 项目结构

```
EverSoulHomeWork/
├── prisma/
│   ├── schema.prisma          # 数据库模型定义
│   ├── dev.db                 # SQLite 数据库
│   └── migrations/            # 数据库迁移记录
├── public/
│   ├── images/               # 静态图片资源
│   │   ├── bg_worldmap.webp           # 世界地图背景
│   │   ├── MS02_GoldenMinister.webp   # 排行榜背景
│   │   └── main_story/                # 主线关卡背景图
│   └── uploads/homework/     # 用户上传的作业图片
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/             # API 路由
│   │   │   ├── admin/       # 管理员 API
│   │   │   │   ├── auth/           # 认证接口
│   │   │   │   └── homework/       # 作业管理接口
│   │   │   ├── cache/       # 数据缓存 API
│   │   │   ├── homework/    # 作业相关 API
│   │   │   │   ├── [stageId]/      # 获取关卡作业
│   │   │   │   ├── by-user/        # 获取玩家作业（v1.2.0）
│   │   │   │   └── upload/         # 上传作业
│   │   │   └── points/      # 积分系统 API（v1.0.0）
│   │   │       ├── leaderboard/           # 排行榜
│   │   │       ├── settle/                # 月度结算
│   │   │       ├── cancel-settlement/     # 取消结算（v1.1.0）
│   │   │       ├── auto-settlement-config/# 自动结算配置（v1.1.0）
│   │   │       ├── auto-settlement-trigger/# 触发自动结算
│   │   │       ├── history/               # 积分历史
│   │   │       └── months/                # 月份列表
│   │   ├── admin/           # 管理员页面
│   │   │   └── cache/       # 缓存管理子页面
│   │   ├── stage/           # 关卡相关页面
│   │   │   └── [id]/        # 关卡详情页
│   │   ├── leaderboard/     # 排行榜页面（v1.0.0）
│   │   └── globals.css      # 全局样式
│   ├── components/          # React 组件
│   │   ├── CacheManagement.tsx      # 缓存管理组件
│   │   ├── HomeworkSection.tsx      # 作业展示组件
│   │   ├── HomeworkUpload.tsx       # 作业上传组件
│   │   ├── PointsLeaderboard.tsx    # 排行榜组件（v1.0.0）
│   │   ├── PointsSettlement.tsx     # 结算管理组件（v1.1.0）
│   │   ├── UserHomeworkModal.tsx    # 玩家作业详情弹窗（v1.2.0）
│   │   ├── StageDetails.tsx         # 关卡详情组件
│   │   └── StageListContent.tsx     # 关卡列表组件
│   ├── config/             # 配置文件
│   ├── lib/                # 工具库
│   │   ├── prisma.ts                # Prisma 客户端
│   │   ├── pointsCalculator.ts      # 积分计算逻辑（v1.0.0）
│   │   └── startup.ts               # 启动初始化
│   ├── types/              # TypeScript 类型定义
│   └── utils/              # 工具函数
│       ├── backgroundUtils.ts       # 背景图片工具
│       └── dataUtils.ts             # 数据处理工具
├── scripts/                # 脚本文件
│   ├── check-db.js                  # 数据库检查
│   ├── init-cache.js                # 缓存初始化
│   └── vacuum-db.js                 # 数据库清理
├── admin-secret.txt        # 管理员密码（需要创建）
├── package.json
└── README.md
```

## 🔌 API 接口文档

### 作业相关接口

#### 获取关卡作业

```http
GET /api/homework/[stageId]
```

- **参数**: `stageId` - 关卡ID（如 "1-1"）
- **返回**: 已审核通过的作业列表

#### 获取玩家作业列表（新增 v1.2.0）

```http
GET /api/homework/by-user?nickname=玩家昵称&page=1&limit=50
```

- **参数**:
  - `nickname`: 玩家昵称（必需）
  - `page`: 页码（可选，默认1）
  - `limit`: 每页数量（可选，默认20）
- **返回**: 玩家所有已审核通过的作业列表，包含区域分布统计

#### 上传作业

```http
POST /api/homework/upload
```

- **Content-Type**: `multipart/form-data`
- **参数**:
  - `stageId`: 关卡ID
  - `nickname`: 用户昵称
  - `description`: 作业描述（可选）
  - `teamCount`: 队伍数量
  - `images`: 图片文件数组

### 管理员接口

#### 管理员认证

```http
POST /api/admin/auth      # 登录
GET /api/admin/auth       # 验证会话
DELETE /api/admin/auth    # 登出
```

#### 作业管理

```http
GET /api/admin/homework                    # 获取作业列表（支持筛选和分页）
PATCH /api/admin/homework/[id]            # 更新作业状态（自动计算积分）
DELETE /api/admin/homework/[id]           # 删除作业
```

### 积分排行榜接口（新增 v1.0.0）

#### 获取排行榜

```http
GET /api/points/leaderboard?yearMonth=2025-10
```

- **参数**: `yearMonth` - 年月（可选，默认当前月）
- **返回**: 排行榜数据、奖池信息、预估奖励

#### 获取月份列表

```http
GET /api/points/months
```

- **返回**: 所有有积分记录的月份列表

#### 获取积分历史

```http
GET /api/points/history?nickname=玩家昵称
```

- **参数**: `nickname` - 玩家昵称
- **返回**: 玩家的积分获取历史（最多50条）

#### 执行月度结算（管理员）

```http
POST /api/points/settle
Content-Type: application/json

{
  "yearMonth": "2025-10"
}
```

- **权限**: 需要管理员登录
- **返回**: 结算结果和奖励明细

#### 取消结算（管理员，v1.1.0）

```http
POST /api/points/cancel-settlement
Content-Type: application/json

{
  "yearMonth": "2025-10"
}
```

- **权限**: 需要管理员登录
- **功能**: 取消指定月份的结算

#### 自动结算配置（管理员，v1.1.0）

```http
GET /api/points/auto-settlement-config           # 获取配置
POST /api/points/auto-settlement-config          # 更新配置

# POST 请求体示例
{
  "enabled": true,
  "dayOfMonth": 1,
  "hour": 0,
  "minute": 0
}
```

#### 触发自动结算（定时任务，兼容接口）

```http
POST /api/points/auto-settlement-trigger
```

- **用途**: 兼容外部定时任务调用（如 Cron、GitHub Actions）
- **功能**: 检查配置并执行自动结算
- **说明**: v1.2.3后已内置自动服务，此接口保留用于兼容性

#### 自动结算服务状态（v1.2.3）

```http
GET /api/points/auto-settlement-status
```

- **权限**: 需要管理员登录
- **功能**: 查看自动结算服务运行状态和服务器时间

#### 基础奖池配置（管理员，v1.2.2）

```http
GET /api/points/base-pool                        # 获取基础奖池配置
POST /api/points/base-pool                       # 更新基础奖池配置

# POST 请求体示例
{
  "basePool": 200
}
```

- **权限**: POST需要管理员登录
- **功能**: 配置每月基础奖池金额（默认200元）

### CDN 缓存配置

**需要禁用缓存的接口**:

- `/api/admin/*` - 所有管理员接口
- `/api/homework/upload` - 作业上传接口
- `/api/points/settle` - 结算相关接口
- `/api/points/auto-settlement-*` - 自动结算接口

**可以缓存的接口**:

- `/api/homework/[stageId]` - 作业展示接口（建议5-15分钟缓存）
- `/api/homework/by-user` - 玩家作业列表（建议10-30分钟缓存）
- `/api/points/leaderboard` - 排行榜数据（建议5-10分钟缓存）
- `/api/points/months` - 月份列表（建议30分钟缓存）

**高频接口**:

- `/api/cache/get/*` - 游戏数据缓存（建议1小时缓存）

## 🗄️ 数据库模型

### UserHomework（用户作业）

- `id`: 唯一标识符
- `stageId`: 关卡ID
- `nickname`: 用户昵称
- `description`: 作业描述
- `teamCount`: 队伍数量
- `status`: 审核状态（pending/approved/rejected）
- `createdAt/updatedAt`: 时间戳

### HomeworkImage（作业图片）

- `id`: 唯一标识符
- `homeworkId`: 关联作业ID
- `filename`: 存储文件名
- `originalName`: 原始文件名
- `fileSize`: 文件大小
- `order`: 图片顺序

### UserPoints（用户积分，v1.0.0）

- `id`: 唯一标识符
- `nickname`: 用户昵称
- `yearMonth`: 年月标识（如 "2025-10"）
- `points`: 累计积分
- `homeworkCount`: 作业数量
- `createdAt/updatedAt`: 时间戳

### MonthlyPrizePool（月度奖池，v1.0.0）

- `id`: 唯一标识符
- `yearMonth`: 年月标识
- `basePool`: 基础奖池（默认200）
- `carryOver`: 上月累加
- `totalPool`: 总奖池
- `totalPoints`: 当月总积分
- `distributed`: 已发放奖励
- `nextCarryOver`: 下月累加
- `isSettled`: 是否已结算
- `settledAt`: 结算时间

### PointsHistory（积分历史，v1.0.0）

- `id`: 唯一标识符
- `nickname`: 用户昵称
- `homeworkId`: 作业ID
- `stageId`: 关卡ID
- `teamCount`: 队伍数量
- `points`: 获得积分
- `isHalved`: 是否减半
- `yearMonth`: 年月标识
- `createdAt`: 创建时间

### AutoSettlementConfig（自动结算配置，v1.1.0）

- `id`: 唯一标识符
- `enabled`: 是否启用
- `dayOfMonth`: 每月几号结算（1-28）
- `hour`: 结算小时（0-23）
- `minute`: 结算分钟（0-59）
- `lastSettledMonth`: 上次结算的月份
- `createdAt/updatedAt`: 时间戳

### SystemConfig（系统配置，v1.2.2）

- `id`: 唯一标识符
- `key`: 配置键名（唯一）
- `value`: 配置值
- `description`: 配置说明
- `createdAt/updatedAt`: 时间戳

**预定义配置项**：
- `base_prize_pool`: 基础奖池金额（默认200元）

### GameDataCache（游戏数据缓存）

- `id`: 唯一标识符
- `dataSource`: 数据源（live/review）
- `fileName`: 数据文件名
- `data`: JSON格式的游戏数据
- `version`: 缓存版本
- `fetchedAt`: 数据获取时间
- `isValid`: 数据是否有效

## 🔧 配置说明

### 管理员密码配置

在项目根目录创建 `admin-secret.txt` 文件：

```
your_secure_password_here
```

### 环境变量（可选）

```env
# 数据库连接（默认使用 SQLite）
DATABASE_URL="file:./dev.db"

# Node 环境
NODE_ENV="production"
```

### Next.js 配置

```javascript
// next.config.js
const nextConfig = {
  images: {
    domains: ['raw.githubusercontent.com'], // 外部图片域名
  },
}
```

## 🎮 核心功能说明

### 积分排行榜系统（v1.0.0+）

#### 积分规则

- **19图及以上**可获得积分
- **队伍积分**：单队0.1分，双队0.5分，三队1分
- **减半规则**：已有作业的图，新作业积分减半

#### 奖励发放

- **基础奖池**：每月默认200元（可在管理后台修改）
- **累加机制**：未发完的奖励可累加到下月（不可连续累加）
- **发放规则**：
  1. 总积分 < 基础奖池：按1:1发放，剩余累加
  2. 基础奖池 ≤ 总积分 < 总奖池：按1:1发放
  3. 总积分 ≥ 总奖池：按比例分配

#### 基础奖池配置（v1.2.2）

管理员可以在后台修改每月基础奖池金额：

1. 登录管理后台，进入「💎 积分结算」标签页
2. 在「💰 基础奖池配置」区域修改金额
3. 点击「保存配置」

**注意事项**：
- 基础奖池范围：0-10000元
- 修改后，新创建的月份将使用新的基础金额
- 已创建的月份奖池不会自动更新

#### 自动结算（v1.1.0 / v1.2.3）

**内置自动结算服务（v1.2.3）**

系统现已内置自动结算服务，无需配置外部定时任务：

1. 服务器启动时自动启动结算服务
2. 每分钟检查一次是否到达结算时间
3. 到达设定时间自动执行结算

**配置方法**：

1. 登录管理后台，进入「💎 积分结算」标签页
2. 在「⏰ 自动结算配置」区域设置：
   - 启用/禁用自动结算
   - 每月几号结算（1-28号）
   - 结算时间（小时:分钟）
3. 界面会显示：
   - 服务运行状态（绿色圆点 = 运行中）
   - 服务器当前时间
   - 自动30秒刷新一次

**注意事项**：
- 服务随应用启动自动运行，无需额外配置
- 每分钟检查一次，精确到分钟级别
- 建议设置时间避开高峰期（如凌晨）
- 系统会自动检查是否已结算，防止重复执行

**外部定时任务（可选，兼容 v1.1.0）**：

如果需要使用外部定时任务：
```bash
# 每月1号0点执行
0 0 1 * * curl -X POST https://your-domain.com/api/points/auto-settlement-trigger
```

### 管理员批量操作（v1.2.1）

- **批量选择**：复选框 + 全选功能
- **批量通过**：一次性审核通过多个作业
- **批量拒绝**：一次性拒绝多个作业
- **批量删除**：一次性删除多个作业
- **效率提升**：审核10个作业从30次操作降至3次（提升90%+）

### 玩家作业查看（v1.2.0）

- 在排行榜点击玩家昵称
- 查看该玩家所有已审核作业
- 按区域分组显示
- 支持分页（每页50个）
- 点击作业卡片直接跳转关卡详情

## 🔄 版本更新日志

### v1.2.3 (2025-10-05)
- ✅ 内置自动结算服务
- ✅ 服务器启动时自动运行定时检查（每分钟）
- ✅ 无需配置外部定时任务
- ✅ 实时显示服务运行状态和服务器时间
- ✅ 管理后台可监控自动结算服务状态

### v1.2.2 (2025-10-05)
- ✅ 添加基础奖池配置功能
- ✅ 管理员可自定义月度基础奖池金额
- ✅ 新增SystemConfig系统配置模型

### v1.2.1 (2025-10-05)
- ✅ 修复图片预览模态框样式
- ✅ 添加管理员批量操作功能
- ✅ 优化审核流程效率

### v1.2.0 (2025-10-05)
- ✅ 添加玩家作业查看功能
- ✅ 排行榜页面背景图片
- ✅ 管理员页面返回主页按钮
- ✅ 修复作业链接跳转格式

### v1.1.0 (2025-10-05)
- ✅ 添加取消结算功能
- ✅ 添加自动结算配置
- ✅ 支持定时任务触发结算

### v1.0.0 (2025-10-05)
- ✅ 积分排行榜系统上线
- ✅ 自动积分计算
- ✅ 月度结算功能
- ✅ 奖池管理

### v0.1.0 (初始版本)
- ✅ 基础作业上传和展示
- ✅ 管理员审核系统
- ✅ 关卡数据展示
- ✅ 数据源切换

## 🛠️ 开发指南

### 本地开发

```bash
# 启动开发服务器
npm run dev

# 类型检查
npm run lint

# 数据库迁移
npx prisma migrate dev

# 重新生成 Prisma Client
npx prisma generate

# 数据库重置（慎用）
npx prisma db push --force-reset
```

### 数据库管理

```bash
# 查看数据库状态
node scripts/check-db.js

# 清理数据库（VACUUM）
node scripts/vacuum-db.js

# 初始化缓存
node scripts/init-cache.js
```


## 📞 支持与反馈

如有问题或建议，请通过以下方式联系：

- GitHub Issues: [提交问题](https://github.com/PackageInstaller/EverSoulHomeWork/issues)

## 📄 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。

---

**Made with ❤️ for EverSoul Community**

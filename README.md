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
  - 批量操作和分页展示
  - 文件系统自动清理
- **🎨 用户体验**

  - 现代化 UI 设计（Tailwind CSS）
  - 暗色主题配色方案
  - 毛玻璃效果和动画交互
  - 移动端响应式适配

### 🔧 技术特性

- **性能优化**

  - 图片懒加载和压缩
  - 数据库查询优化
  - 静态资源 CDN 友好
- **安全性**

  - XSS 防护（输入过滤）
  - 文件上传安全验证
  - 会话管理和权限控制
- **可维护性**

  - TypeScript 类型安全
  - 模块化组件设计
  - 统一的错误处理

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
│   └── schema.prisma          # 数据库模型定义
├── public/
│   ├── images/               # 静态图片资源
│   └── uploads/homework/     # 用户上传的作业图片
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/             # API 路由
│   │   │   ├── admin/       # 管理员 API
│   │   │   └── homework/    # 作业相关 API
│   │   ├── admin/           # 管理员页面
│   │   ├── stage/           # 关卡相关页面
│   │   └── globals.css      # 全局样式
│   ├── components/          # React 组件
│   ├── config/             # 配置文件
│   ├── lib/                # 工具库
│   ├── types/              # TypeScript 类型定义
│   └── utils/              # 工具函数
├── admin-secret.txt         # 管理员密码（需要创建）
└── package.json
```

## 🔌 API 接口文档

### 作业相关接口

#### 获取关卡作业

```http
GET /api/homework/[stageId]
```

- **参数**: `stageId` - 关卡ID（如 "1-1"）
- **返回**: 已审核通过的作业列表

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
GET /api/admin/homework                    # 获取作业列表
PATCH /api/admin/homework/[id]            # 更新作业状态
DELETE /api/admin/homework/[id]           # 删除作业
```

### CDN 缓存配置

**需要禁用缓存的接口**:

- `/api/admin/*` - 所有管理员接口
- `/api/homework/upload` - 作业上传接口

**可以缓存的接口**:

- `/api/homework/[stageId]` - 作业展示接口（建议5-15分钟缓存）

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

## 🛠️ 开发指南

### 本地开发

```bash
# 启动开发服务器
npm run dev

# 类型检查
npm run lint

# 数据库重置
npx prisma db push --force-reset
```

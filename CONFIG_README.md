# 配置文件说明

## 🔐 管理员密码

首次启动应用时，系统会自动生成高强度的管理员密码。

### 查看密码的方法

#### 方法1：查看启动日志
启动应用时（`npm run dev` 或 `npm start`），控制台会输出：
```
✅ 已创建新的配置文件
🔑 管理员密码: 7y.QSqyF|%v5YW17
⚠️ 请妥善保管此密码！
```

#### 方法2：直接查看配置文件
```bash
cat admin-secret.json
```

配置文件格式：
```json
{
  "adminPassword": "你的管理员密码",
  "jwtSecret": "自动生成的JWT密钥"
}
```

## 📁 配置文件位置

- **文件名**: `admin-secret.json`
- **位置**: 项目根目录
- **安全性**: 已加入 `.gitignore`，不会被提交到版本控制

## 🔧 修改配置

### 修改管理员密码
1. 编辑 `admin-secret.json`
2. 修改 `adminPassword` 字段
3. 重启应用

### 重置配置
如果忘记密码或配置损坏：
```bash
# 删除配置文件
rm admin-secret.json

# 重新启动应用，会自动生成新配置
npm run dev
```

## 🔒 安全建议

1. **妥善保管密码** - 首次生成的密码请立即记录
2. **不要提交配置文件** - `admin-secret.json` 已在 `.gitignore` 中
3. **定期更换密码** - 建议定期手动更新管理员密码
4. **使用环境变量** - 生产环境可使用 `JWT_SECRET` 环境变量覆盖JWT密钥

## 🚀 生产环境部署

### 方法1：使用配置文件
```bash
# 1. 创建配置文件
cp admin-secret.json.example admin-secret.json

# 2. 修改密码
nano admin-secret.json

# 3. 启动应用
npm start
```

### 方法2：使用环境变量
```bash
# .env.production
JWT_SECRET=your-custom-jwt-secret

# 密码仍需在 admin-secret.json 中配置
```

## 📝 密码规则

自动生成的密码特点：
- 长度：16位
- 包含：大写字母、小写字母、数字、特殊字符
- 特殊字符包括：`!@#$%^&*()_+-=[]{}|;:,.<>?`
- 字符顺序随机打乱

JWT密钥特点：
- 长度：128位十六进制（64字节）
- 使用 `crypto.randomBytes(64)` 生成
- 高度随机且安全

## ⚠️ 常见问题

### Q: 忘记管理员密码怎么办？
A: 删除 `admin-secret.json` 文件，重启应用会自动生成新密码。

### Q: 配置文件损坏怎么办？
A: 应用会自动检测并重新生成配置文件。

### Q: 如何在多台服务器间同步配置？
A: 手动复制 `admin-secret.json` 文件，或使用统一的配置管理系统。

### Q: JWT密钥可以自定义吗？
A: 可以，通过环境变量 `JWT_SECRET` 设置，或直接修改配置文件。

## 🔄 配置更新历史

- **v1.0**: 初始版本，使用 `admin-secret.txt`
- **v2.0**: 升级为 JSON 格式，添加 JWT 密钥管理
- **v2.1**: 添加自动密码生成，改进错误处理


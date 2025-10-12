import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface AppConfig {
  adminPassword: string;
  jwtSecret: string;
}

const CONFIG_FILE_PATH = path.join(process.cwd(), 'admin-secret.json');

/**
 * 生成随机JWT密钥
 */
function generateJwtSecret(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * 读取配置文件
 */
export function loadConfig(): AppConfig {
  try {
    // 尝试读取JSON配置文件
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const configData = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const config = JSON.parse(configData) as AppConfig;
      
      // 验证配置完整性，如果缺少JWT密钥则生成
      if (!config.jwtSecret) {
        config.jwtSecret = generateJwtSecret();
        saveConfig(config);
        console.log('✅ 已自动生成JWT密钥');
      }
      
      return config;
    }
    
    // 尝试读取旧格式的txt文件（兼容性）
    const oldConfigPath = path.join(process.cwd(), 'admin-secret.txt');
    if (fs.existsSync(oldConfigPath)) {
      const adminPassword = fs.readFileSync(oldConfigPath, 'utf-8').trim();
      const config: AppConfig = {
        adminPassword,
        jwtSecret: generateJwtSecret()
      };
      
      // 保存为新格式
      saveConfig(config);
      console.log('✅ 已迁移配置文件到JSON格式');
      
      // 删除旧文件
      try {
        fs.unlinkSync(oldConfigPath);
        console.log('✅ 已删除旧配置文件');
      } catch (error) {
        console.warn('⚠️ 无法删除旧配置文件:', error);
      }
      
      return config;
    }
    
    // 如果都不存在，创建默认配置
    const defaultConfig: AppConfig = {
      adminPassword: '1',
      jwtSecret: generateJwtSecret()
    };
    
    saveConfig(defaultConfig);
    console.log('✅ 已创建默认配置文件');
    
    return defaultConfig;
    
  } catch (error) {
    console.error('❌ 读取配置文件失败:', error);
    
    // 返回默认配置
    return {
      adminPassword: '1',
      jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key'
    };
  }
}

/**
 * 保存配置文件
 */
export function saveConfig(config: AppConfig): void {
  try {
    const configData = JSON.stringify(config, null, 2);
    fs.writeFileSync(CONFIG_FILE_PATH, configData, 'utf-8');
  } catch (error) {
    console.error('❌ 保存配置文件失败:', error);
  }
}

/**
 * 获取管理员密码
 */
export function getAdminPassword(): string {
  const config = loadConfig();
  return config.adminPassword;
}

/**
 * 获取JWT密钥
 */
export function getJwtSecret(): string {
  const config = loadConfig();
  return config.jwtSecret;
}

/**
 * 更新管理员密码
 */
export function updateAdminPassword(newPassword: string): void {
  const config = loadConfig();
  config.adminPassword = newPassword;
  saveConfig(config);
}


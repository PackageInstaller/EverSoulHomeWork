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
 * 生成高复杂度随机密码
 * 包含大小写字母、数字和特殊字符，长度16位
 */
function generateSecurePassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  // 确保至少包含每种类型的字符
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // 填充剩余字符
  for (let i = password.length; i < 16; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // 打乱字符顺序
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * 读取配置文件
 */
export function loadConfig(): AppConfig {
  try {
    // 尝试读取JSON配置文件
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const configData = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8').trim();
      
      // 检查文件是否为空
      if (!configData) {
        console.log('⚠️ 配置文件为空，重新生成...');
        const newConfig: AppConfig = {
          adminPassword: generateSecurePassword(),
          jwtSecret: generateJwtSecret()
        };
        saveConfig(newConfig);
        console.log('✅ 已生成新的配置文件');
        console.log('🔑 管理员密码:', newConfig.adminPassword);
        console.log('⚠️ 请妥善保管此密码！');
        return newConfig;
      }
      
      try {
        const config = JSON.parse(configData) as AppConfig;
        
        // 验证配置完整性
        let needsSave = false;
        
        if (!config.jwtSecret) {
          config.jwtSecret = generateJwtSecret();
          needsSave = true;
          console.log('✅ 已自动生成JWT密钥');
        }
        
        if (!config.adminPassword) {
          config.adminPassword = generateSecurePassword();
          needsSave = true;
          console.log('✅ 已自动生成管理员密码:', config.adminPassword);
          console.log('⚠️ 请妥善保管此密码！');
        }
        
        if (needsSave) {
          saveConfig(config);
        }
        
        return config;
      } catch (parseError) {
        console.error('⚠️ 配置文件JSON格式错误，重新生成...');
        const newConfig: AppConfig = {
          adminPassword: generateSecurePassword(),
          jwtSecret: generateJwtSecret()
        };
        saveConfig(newConfig);
        console.log('✅ 已生成新的配置文件');
        console.log('🔑 管理员密码:', newConfig.adminPassword);
        console.log('⚠️ 请妥善保管此密码！');
        return newConfig;
      }
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
      adminPassword: generateSecurePassword(),
      jwtSecret: generateJwtSecret()
    };
    
    saveConfig(defaultConfig);
    console.log('✅ 已创建新的配置文件');
    console.log('🔑 管理员密码:', defaultConfig.adminPassword);
    console.log('⚠️ 请妥善保管此密码！');
    
    return defaultConfig;
    
  } catch (error) {
    console.error('❌ 读取配置文件失败:', error);
    
    // 尝试生成新配置
    try {
      const emergencyConfig: AppConfig = {
        adminPassword: generateSecurePassword(),
        jwtSecret: generateJwtSecret()
      };
      saveConfig(emergencyConfig);
      console.log('✅ 已生成紧急配置文件');
      console.log('🔑 管理员密码:', emergencyConfig.adminPassword);
      console.log('⚠️ 请妥善保管此密码！');
      return emergencyConfig;
    } catch (saveError) {
      console.error('❌ 无法保存配置文件:', saveError);
      // 最后的fallback
      return {
        adminPassword: generateSecurePassword(),
        jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex')
      };
    }
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


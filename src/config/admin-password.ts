import { createHash } from 'crypto'
import { getAdminPassword } from '@/lib/config'

// 管理员密码配置
// 密码存储在项目根目录的 admin-secret.json 文件中

/**
 * 读取配置文件并计算密码的SHA512哈希值
 * @returns 密码的SHA512哈希值
 */
function getPasswordHashFromConfig(): string {
  try {
    // 从配置文件读取密码
    const passwordContent = getAdminPassword()
    
    // 计算密码的SHA512哈希
    return createHash('sha512').update(passwordContent, 'utf8').digest('hex')
  } catch (error) {
    console.error('读取配置文件失败:', error)
    throw new Error('配置文件不存在或无法读取')
  }
}

/**
 * 验证管理员密码
 * @param inputPassword 用户输入的密码
 * @returns 验证结果
 */
export function validateAdminPassword(inputPassword: string): boolean {
  try {
    // 计算输入密码的SHA512哈希
    const inputHash = createHash('sha512').update(inputPassword, 'utf8').digest('hex')
    
    // 获取配置文件中密码的哈希值
    const fileHash = getPasswordHashFromConfig()
    
    // 比较哈希值
    return inputHash === fileHash
  } catch (error) {
    console.error('密码验证失败:', error)
    return false
  }
} 
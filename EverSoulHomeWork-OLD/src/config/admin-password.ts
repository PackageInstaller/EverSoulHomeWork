import { readFileSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'

// 管理员密码配置
// 密码存储在项目根目录的 admin-secret.txt 文件中

/**
 * 读取密码文件并计算其SHA512哈希值
 * @returns 密码文件内容的SHA512哈希值
 */
function getPasswordHashFromFile(): string {
  try {
    // 读取项目根目录下的密码文件
    const passwordFilePath = join(process.cwd(), 'admin-secret.txt')
    const passwordContent = readFileSync(passwordFilePath, 'utf8').trim()
    
    // 计算文件内容的SHA512哈希
    return createHash('sha512').update(passwordContent, 'utf8').digest('hex')
  } catch (error) {
    console.error('读取密码文件失败:', error)
    throw new Error('密码文件不存在或无法读取')
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
    
    // 获取密码文件的哈希值
    const fileHash = getPasswordHashFromFile()
    
    // 比较哈希值
    return inputHash === fileHash
  } catch (error) {
    console.error('密码验证失败:', error)
    return false
  }
} 
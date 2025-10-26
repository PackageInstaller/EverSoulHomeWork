import { NextRequest } from 'next/server';
import jwt, { SignOptions } from 'jsonwebtoken';
import { getJwtSecret } from './config';

// 获取JWT密钥（优先使用环境变量，其次使用配置文件）
function getSecret(): string {
  return process.env.JWT_SECRET || getJwtSecret();
}

export interface AdminJWTPayload {
  role: 'admin';
  iat?: number;
  exp?: number;
}

/**
 * 验证管理员会话
 * 使用 JWT 验证 admin_session cookie
 */
export async function validateAdminSession(request: NextRequest): Promise<boolean> {
  const sessionToken = request.cookies.get('admin_session')?.value;

  if (!sessionToken) {
    return false;
  }

  try {
    const decoded = jwt.verify(sessionToken, getSecret()) as AdminJWTPayload;
    return decoded.role === 'admin';
  } catch (error) {
    // JWT 验证失败（过期、签名无效等）
    return false;
  }
}

/**
 * 生成管理员会话 Token
 * @param expiresIn 过期时间，默认 1 小时（支持 '1h', '2d' 等格式，或秒数）
 */
export function generateAdminSessionToken(expiresIn: string = '1h'): string {
  const payload: AdminJWTPayload = {
    role: 'admin'
  };
  return jwt.sign(payload, getSecret(), { expiresIn } as SignOptions);
}


import jwt from 'jsonwebtoken';
import { getJwtSecret } from './config';

// JWT过期时间（7天）
const JWT_EXPIRES_IN = '7d';

// 获取JWT密钥（优先使用环境变量，其次使用配置文件）
function getSecret(): string {
  return process.env.JWT_SECRET || getJwtSecret();
}

export interface JWTPayload {
  id: string;
  email: string;
  nickname: string;
}

/**
 * 生成JWT token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * 验证并解析JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * 从请求头获取并验证token
 */
export function getUserFromToken(authHeader: string | null): JWTPayload | null {
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  return verifyToken(token);
}


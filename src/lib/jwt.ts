import jwt from 'jsonwebtoken';
import { getJwtSecret } from './config';
import { prisma } from './prisma';

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
  iat?: number; // token签发时间（秒）
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
 * 验证token并检查是否在密码修改之后签发
 */
export async function verifyTokenWithPasswordCheck(token: string): Promise<JWTPayload | null> {
  try {
    const decoded = jwt.verify(token, getSecret()) as JWTPayload;
    
    // 获取用户的updatedAt时间
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { updatedAt: true }
    });

    if (!user) {
      return null;
    }

    // 检查token的签发时间是否早于用户信息的最后更新时间
    // 如果token是在用户信息更新（如密码修改）之前签发的，则token失效
    if (decoded.iat) {
      const tokenIssuedAt = new Date(decoded.iat * 1000); // JWT的iat是秒，转换为毫秒
      const userUpdatedAt = new Date(user.updatedAt);
      
      if (tokenIssuedAt < userUpdatedAt) {
        // Token是在密码修改之前签发的，已失效
        return null;
      }
    }

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

/**
 * 从请求头获取并验证token（带密码修改检查）
 */
export async function getUserFromTokenWithPasswordCheck(authHeader: string | null): Promise<JWTPayload | null> {
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  return verifyTokenWithPasswordCheck(token);
}


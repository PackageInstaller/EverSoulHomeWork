import jwt from 'jsonwebtoken';

// JWT密钥（生产环境应该从环境变量读取）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// JWT过期时间（7天）
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  id: string;
  email: string;
  nickname: string;
}

/**
 * 生成JWT token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * 验证并解析JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
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


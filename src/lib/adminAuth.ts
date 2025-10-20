import { NextRequest } from 'next/server';

/**
 * 验证管理员会话
 * 检查 admin_session cookie 是否有效
 */
export async function validateAdminSession(request: NextRequest): Promise<boolean> {
  const sessionToken = request.cookies.get('admin_session')?.value;

  if (!sessionToken) {
    return false;
  }

  try {
    const decoded = Buffer.from(sessionToken, 'base64').toString();
    const [user, timestamp] = decoded.split(':');
    
    if (user !== 'admin') {
      return false;
    }

    const tokenTime = parseInt(timestamp);
    const currentTime = Date.now();
    const oneHour = 3600000; // 1小时的毫秒数

    if (currentTime - tokenTime > oneHour) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}


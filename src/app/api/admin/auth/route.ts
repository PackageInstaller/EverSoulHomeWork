import { NextRequest, NextResponse } from 'next/server';
import { validateAdminPassword } from '@/config/admin-password';

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, message: '请输入密码' },
        { status: 400 }
      );
    }

    // 验证密码
    const isValid = validateAdminPassword(password);

    if (isValid) {
      // 生成简单的会话token (在生产环境中应该使用更安全的方法)
      const sessionToken = Buffer.from(`admin:${Date.now()}`).toString('base64');
      
      const response = NextResponse.json({
        success: true,
        message: '登录成功'
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      // 设置cookie (有效期1小时)
      response.cookies.set('admin_session', sessionToken, {
        httpOnly: true,
        secure: false, // 允许HTTP连接（如果使用HTTPS，改为true）
        sameSite: 'lax', // 使用lax以兼容更多场景
        maxAge: 3600, // 1小时
        path: '/' // 明确指定路径
      });

      return response;
    } else {
      return NextResponse.json(
        { success: false, message: '密码错误' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// 验证管理员会话
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('admin_session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      );
    }

    // 验证token格式和时间
    try {
      const decoded = Buffer.from(sessionToken, 'base64').toString();
      const [user, timestamp] = decoded.split(':');
      
      if (user !== 'admin') {
        throw new Error('Invalid user');
      }

      const tokenTime = parseInt(timestamp);
      const currentTime = Date.now();
      const oneHour = 3600000; // 1小时的毫秒数

      if (currentTime - tokenTime > oneHour) {
        throw new Error('Token expired');
      }

      return NextResponse.json({
        success: true,
        message: '会话有效'
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch {
      return NextResponse.json(
        { success: false, message: '会话无效' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// 登出
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: '已登出'
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });

  // 清除cookie
  response.cookies.delete('admin_session');

  return response;
} 
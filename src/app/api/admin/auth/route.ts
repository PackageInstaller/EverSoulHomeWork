import { NextRequest, NextResponse } from 'next/server';
import { validateAdminPassword } from '@/config/admin-password';
import { generateAdminSessionToken, validateAdminSession } from '@/lib/adminAuth';

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
      // 生成 JWT 会话 token（1小时有效期）
      const sessionToken = generateAdminSessionToken('1h');
      
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
        secure: process.env.NODE_ENV === 'production', // 生产环境使用 HTTPS
        sameSite: 'lax',
        maxAge: 3600, // 1小时
        path: '/'
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
    const isValid = await validateAdminSession(request);

    if (isValid) {
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
    } else {
      return NextResponse.json(
        { success: false, message: '会话无效或已过期' },
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
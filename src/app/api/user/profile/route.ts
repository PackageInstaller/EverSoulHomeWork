import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// 辅助函数：从token获取用户ID
function getUserIdFromToken(token: string | null): string | null {
  if (!token) return null;
  
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const userData = JSON.parse(decoded);
    return userData.id;
  } catch (error) {
    return null;
  }
}

// GET - 获取用户信息
export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// PATCH - 更新用户信息
export async function PATCH(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nickname, oldPassword, newPassword } = body;

    // 验证昵称
    if (!nickname || !nickname.trim()) {
      return NextResponse.json(
        { success: false, message: '昵称不能为空' },
        { status: 400 }
      );
    }

    // 验证昵称长度
    const getByteLength = (str: string) => {
      let byteLength = 0;
      for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i);
        if (charCode >= 0x4e00 && charCode <= 0x9fff) {
          byteLength += 2;
        } else {
          byteLength += 1;
        }
      }
      return byteLength;
    };

    if (getByteLength(nickname) > 16) {
      return NextResponse.json(
        { success: false, message: '昵称过长！最多16个字符（中文为2个字符）' },
        { status: 400 }
      );
    }

    // 获取当前用户
    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    // 准备更新数据
    const updateData: any = {
      nickname: nickname.trim()
    };

    // 如果要修改密码
    if (oldPassword && newPassword) {
      // 验证旧密码
      const isOldPasswordValid = await bcrypt.compare(oldPassword, currentUser.password);
      
      if (!isOldPasswordValid) {
        return NextResponse.json(
          { success: false, message: '当前密码不正确' },
          { status: 400 }
        );
      }

      // 验证新密码长度
      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: '新密码长度至少6位' },
          { status: 400 }
        );
      }

      // 加密新密码
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // 更新用户
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        nickname: true,
        updatedAt: true
      }
    });

    // 生成新token
    const newToken = Buffer.from(JSON.stringify({
      id: updatedUser.id,
      email: updatedUser.email,
      nickname: updatedUser.nickname,
      timestamp: Date.now()
    })).toString('base64');

    return NextResponse.json({
      success: true,
      message: '资料更新成功',
      token: newToken,
      user: updatedUser
    });

  } catch (error) {
    console.error('更新用户信息失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}


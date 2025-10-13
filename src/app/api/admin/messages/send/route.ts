import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAdminPassword } from '@/config/admin-password';

export const dynamic = 'force-dynamic';

// 管理员发送消息
export async function POST(request: Request) {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    if (!validateAdminPassword(token)) {
      return NextResponse.json(
        { success: false, message: '管理员权限验证失败' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userIds, title, content, sendToAll } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, message: '标题和内容不能为空' },
        { status: 400 }
      );
    }

    let targetUserIds: string[] = [];

    if (sendToAll) {
      // 发送给所有用户
      const allUsers = await prisma.user.findMany({
        select: { id: true },
      });
      targetUserIds = allUsers.map((user) => user.id);
    } else {
      // 发送给指定用户
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json(
          { success: false, message: '请选择至少一个接收用户' },
          { status: 400 }
        );
      }
      targetUserIds = userIds;
    }

    // 为每个用户创建一条消息记录
    const messages = targetUserIds.map((userId) => ({
      userId,
      senderId: null, // 管理员消息，senderId为null
      type: 'admin',
      title,
      content,
      isRead: false,
    }));

    await prisma.message.createMany({
      data: messages,
    });

    return NextResponse.json({
      success: true,
      message: `成功发送消息给 ${targetUserIds.length} 位用户`,
      count: targetUserIds.length,
    });
  } catch (error) {
    console.error('发送消息失败:', error);
    return NextResponse.json(
      { success: false, message: '发送消息失败' },
      { status: 500 }
    );
  }
}


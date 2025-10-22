import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

// 获取用户消息列表
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const userData = getUserFromToken(authHeader);

    if (!userData) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // system, admin, unread, read, 或不传（全部）

    const where: any = {
      userId: userData.id,
    };

    if (type === 'unread') {
      where.isRead = false;
    } else if (type === 'read') {
      where.isRead = true;
    } else if (type === 'system' || type === 'admin') {
      where.type = type;
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 获取未读消息数量
    const unreadCount = await prisma.message.count({
      where: {
        userId: userData.id,
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      messages,
      unreadCount,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('获取消息列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取消息列表失败' },
      { status: 500 }
    );
  }
}


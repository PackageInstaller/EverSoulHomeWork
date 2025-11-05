import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

// 标记消息为已读
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const userData = getUserFromToken(authHeader);

    if (!userData) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const messageId = params.id;

    // 验证消息是否属于当前用户
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, message: '消息不存在' },
        { status: 404 }
      );
    }

    if (message.userId !== userData.id) {
      return NextResponse.json(
        { success: false, message: '无权访问此消息' },
        { status: 403 }
      );
    }

    // 标记为已读
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { isRead: true },
    });

    return NextResponse.json({
      success: true,
      message: updatedMessage,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('标记消息已读失败:', error);
    return NextResponse.json(
      { success: false, message: '标记消息已读失败' },
      { status: 500 }
    );
  }
}

// 删除消息
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const userData = getUserFromToken(authHeader);

    if (!userData) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const messageId = params.id;

    // 验证消息是否属于当前用户
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, message: '消息不存在' },
        { status: 404 }
      );
    }

    if (message.userId !== userData.id) {
      return NextResponse.json(
        { success: false, message: '无权访问此消息' },
        { status: 403 }
      );
    }

    // 删除消息
    await prisma.message.delete({
      where: { id: messageId },
    });

    return NextResponse.json({
      success: true,
      message: '消息已删除',
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('删除消息失败:', error);
    return NextResponse.json(
      { success: false, message: '删除消息失败' },
      { status: 500 }
    );
  }
}


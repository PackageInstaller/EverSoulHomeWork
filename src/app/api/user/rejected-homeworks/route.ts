import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 验证用户token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload || !payload.id) {
      return NextResponse.json(
        { success: false, error: 'Token无效' },
        { status: 401 }
      );
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { nickname: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 获取该用户的所有被拒绝和已通过的作业
    const homeworks = await prisma.userHomework.findMany({
      where: {
        nickname: user.nickname,
        status: {
          in: ['rejected', 'approved']
        }
      },
      include: {
        images: {
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        updatedAt: 'desc' // 按最后更新时间倒序
      }
    });

    // 添加图片完整URL
    const homeworksWithUrls = homeworks.map(homework => ({
      ...homework,
      images: homework.images.map(img => ({
        ...img,
        url: `/api/uploads/homework/${img.filename}`
      }))
    }));

    return NextResponse.json({
      success: true,
      homeworks: homeworksWithUrls
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('获取被拒绝作业失败:', error);
    return NextResponse.json(
      { success: false, error: '获取作业列表失败' },
      { status: 500 }
    );
  }
}


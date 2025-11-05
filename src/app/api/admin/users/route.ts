import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAdminSession } from '@/lib/adminAuth'
export const dynamic = 'force-dynamic';



// 获取所有用户列表（供管理员选择）
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    if (!await validateAdminSession(request)) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    // 检查是否需要包含待审核作业数量
    const { searchParams } = new URL(request.url);
    const includePendingCount = searchParams.get('includePendingCount') === 'true';

    const users = await prisma.user.findMany({
      select: {
        id: true,
        nickname: true,
        email: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 如果需要包含待审核数量，为每个用户查询
    if (includePendingCount) {
      const usersWithPending = await Promise.all(
        users.map(async (user) => {
          const pendingCount = await prisma.userHomework.count({
            where: {
              nickname: user.nickname,
              status: 'pending'
            }
          });
          return {
            ...user,
            pendingCount
          };
        })
      );

      return NextResponse.json({
        success: true,
        users: usersWithPending,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    return NextResponse.json({
      success: true,
      users,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取用户列表失败' },
      { status: 500 }
    );
  }
}


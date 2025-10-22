import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    // 计算总积分排行
    // 从 user_points 表中按昵称分组，统计每个用户的总积分和作业数量
    const allUsers = await prisma.userPoints.groupBy({
      by: ['nickname'],
      _sum: {
        points: true,
        homeworkCount: true,
      },
      _max: {
        updatedAt: true,
      },
    });

    // 转换为排行数据
    let rankData = allUsers
      .map((user, index) => ({
        id: index + 1,
        nickname: user.nickname,
        totalPoints: user._sum.points || 0,
        homeworkCount: user._sum.homeworkCount || 0,
        lastUpdated: user._max.updatedAt?.toLocaleString('zh-CN') || '',
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints); // 按总积分降序排序

    // 添加排名
    rankData = rankData.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    // 搜索过滤
    if (search) {
      rankData = rankData.filter((item) =>
        item.nickname.includes(search)
      );
    }

    // 分页
    const total = rankData.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = rankData.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('获取总积分排行失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}


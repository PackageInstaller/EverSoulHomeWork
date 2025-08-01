import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 验证管理员会话
async function validateAdminSession(request: NextRequest) {
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
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const isValid = await validateAdminSession(request);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'pending'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // 获取作业列表
    const homeworks = await prisma.userHomework.findMany({
      where: status === 'all' ? {} : { status },
      include: {
        images: {
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    // 获取总数
    const total = await prisma.userHomework.count({
      where: status === 'all' ? {} : { status }
    })

    return NextResponse.json({
      success: true,
      homeworks: homeworks.map((homework: { id: any; stageId: any; nickname: any; description: any; teamCount: any; status: any; createdAt: any; updatedAt: any; images: any[]; }) => ({
        id: homework.id,
        stageId: homework.stageId,
        nickname: homework.nickname,
        description: homework.description,
        teamCount: homework.teamCount,
        status: homework.status,
        createdAt: homework.createdAt,
        updatedAt: homework.updatedAt,
        images: homework.images.map((img: { id: any; filename: any; originalName: any; order: any; fileSize: any; }) => ({
          id: img.id,
          filename: img.filename,
          originalName: img.originalName,
          order: img.order,
          fileSize: img.fileSize,
          url: `/uploads/homework/${img.filename}`
        }))
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('获取作业列表失败:', error)
    return NextResponse.json(
      { error: '获取作业列表失败' },
      { status: 500 }
    )
  }
} 
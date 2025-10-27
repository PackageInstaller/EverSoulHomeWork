import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAdminSession } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

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
          url: `/api/uploads/homework/${img.filename}`
        }))
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
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
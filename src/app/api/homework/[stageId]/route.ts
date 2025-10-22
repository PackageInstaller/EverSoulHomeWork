import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { stageId: string } }
) {
  try {
    const { stageId } = params

    // 验证关卡ID格式
    if (!/^\d+-\d+$/.test(stageId)) {
      return NextResponse.json(
        { error: '关卡ID格式不正确' },
        { status: 400 }
      )
    }

    // 获取已审核通过的作业
    const homeworks = await prisma.userHomework.findMany({
      where: {
        stageId,
        status: 'approved'
      },
      include: {
        images: {
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      homeworks: homeworks.map((homework: { id: any; nickname: any; description: any; teamCount: any; createdAt: any; updatedAt: any; images: any[]; }) => ({
        id: homework.id,
        nickname: homework.nickname,
        description: homework.description,
        teamCount: homework.teamCount,
        createdAt: homework.createdAt,
        images: homework.images.map((img: { id: any; filename: any; originalName: any; order: any; }) => ({
          id: img.id,
          filename: img.filename,
          originalName: img.originalName,
          order: img.order,
          url: `/api/uploads/homework/${img.filename}`
        }))
      }))
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('获取作业失败:', error)
    return NextResponse.json(
      { error: '获取作业失败' },
      { status: 500 }
    )
  }
} 
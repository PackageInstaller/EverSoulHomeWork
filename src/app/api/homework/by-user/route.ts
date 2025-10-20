import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nickname = searchParams.get('nickname')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!nickname) {
      return NextResponse.json(
        { error: '缺少昵称参数' },
        { status: 400 }
      )
    }

    // 计算跳过的记录数
    const skip = (page - 1) * limit

    // 获取该玩家的所有已审核作业
    const [homeworks, total] = await Promise.all([
      prisma.userHomework.findMany({
        where: {
          nickname,
          status: 'approved'
        },
        include: {
          images: {
            orderBy: {
              order: 'asc'
            },
            take: 1 // 只获取第一张图片作为缩略图
          }
        },
        orderBy: [
          { stageId: 'asc' } // 按关卡ID排序
        ],
        skip,
        take: limit
      }),
      prisma.userHomework.count({
        where: {
          nickname,
          status: 'approved'
        }
      })
    ])

    // 按区域分组
    const groupedByArea: { [key: string]: typeof homeworks } = {}
    homeworks.forEach(hw => {
      const area = hw.stageId.split('-')[0]
      if (!groupedByArea[area]) {
        groupedByArea[area] = []
      }
      groupedByArea[area].push(hw)
    })

    return NextResponse.json({
      success: true,
      nickname,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      homeworks: homeworks.map(hw => ({
        id: hw.id,
        stageId: hw.stageId,
        description: hw.description,
        teamCount: hw.teamCount,
        createdAt: hw.createdAt,
        thumbnail: hw.images[0] ? `/uploads/homework/${hw.images[0].filename}?v=${new Date(hw.updatedAt).getTime()}` : null
      })),
      groupedByArea: Object.keys(groupedByArea).sort((a, b) => parseInt(a) - parseInt(b)).map(area => ({
        area: parseInt(area),
        stages: groupedByArea[area].map(hw => hw.stageId)
      }))
    })

  } catch (error) {
    console.error('获取玩家作业失败:', error)
    return NextResponse.json(
      { error: '获取作业失败' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nickname = searchParams.get('nickname')

    if (!nickname) {
      return NextResponse.json(
        { error: '缺少昵称参数' },
        { status: 400 }
      )
    }

    // 获取用户的积分历史
    const history = await prisma.pointsHistory.findMany({
      where: { nickname },
      orderBy: { createdAt: 'desc' },
      take: 50 // 最多返回50条
    })

    return NextResponse.json({
      success: true,
      history: history.map(h => ({
        id: h.id,
        stageId: h.stageId,
        teamCount: h.teamCount,
        points: h.points,
        isHalved: h.isHalved,
        yearMonth: h.yearMonth,
        createdAt: h.createdAt
      }))
    })

  } catch (error) {
    console.error('获取积分历史失败:', error)
    return NextResponse.json(
      { error: '获取积分历史失败' },
      { status: 500 }
    )
  }
}

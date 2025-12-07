import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentYearMonth, getOrCreateMonthlyPrizePool } from '@/lib/pointsCalculator'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const yearMonth = searchParams.get('yearMonth') || getCurrentYearMonth()

    // 获取排行榜数据
    const userPoints = await prisma.userPoints.findMany({
      where: { yearMonth },
      orderBy: [
        { points: 'desc' },
        { updatedAt: 'asc' } // 积分相同时，先达到的排前面
      ]
    })

    // 获取奖池信息
    const prizePool = await getOrCreateMonthlyPrizePool(yearMonth)

    // 计算总积分（保留2位小数）
    const totalPoints = Math.round(userPoints.reduce((sum, up) => sum + up.points, 0) * 100) / 100

    // 预估奖励（如果当前结算）
    const leaderboard = userPoints.map((up, index) => {
      let estimatedReward = 0
      if (totalPoints > 0) {
        if (totalPoints < prizePool.totalPool) {
          // 1:1发放
          estimatedReward = up.points
        } else {
          // 按比例分配
          estimatedReward = (up.points / totalPoints) * prizePool.totalPool
        }
      }

      return {
        rank: index + 1,
        nickname: up.nickname,
        points: Math.round(up.points * 100) / 100,
        homeworkCount: up.homeworkCount,
        estimatedReward: Math.round(estimatedReward * 100) / 100,
        updatedAt: up.updatedAt
      }
    })

    return NextResponse.json({
      success: true,
      yearMonth,
      totalPoints,
      prizePool: {
        basePool: Math.round(prizePool.basePool * 100) / 100,
        carryOver: Math.round(prizePool.carryOver * 100) / 100,
        totalPool: Math.round(prizePool.totalPool * 100) / 100,
        isSettled: prizePool.isSettled,
        distributed: Math.round(prizePool.distributed * 100) / 100,
        settledAt: prizePool.settledAt
      },
      leaderboard
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('获取排行榜失败:', error)
    return NextResponse.json(
      { error: '获取排行榜失败' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAdminSession } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const isValid = await validateAdminSession(request)
    if (!isValid) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 401 }
      )
    }

    const { yearMonth } = await request.json()

    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return NextResponse.json(
        { error: '年月格式不正确，应为 YYYY-MM' },
        { status: 400 }
      )
    }

    // 查找奖池记录
    const pool = await prisma.monthlyPrizePool.findUnique({
      where: { yearMonth }
    })

    if (!pool) {
      return NextResponse.json(
        { error: '未找到该月份的奖池记录' },
        { status: 404 }
      )
    }

    if (!pool.isSettled) {
      return NextResponse.json(
        { error: '该月份尚未结算，无需取消' },
        { status: 400 }
      )
    }
    const pointsHistories = await prisma.pointsHistory.findMany({
      where: { yearMonth }
    })

    const userPointsMap = new Map<string, { points: number, count: number }>()
    pointsHistories.forEach(history => {
      const existing = userPointsMap.get(history.nickname) || { points: 0, count: 0 }
      userPointsMap.set(history.nickname, {
        points: existing.points + history.points,
        count: existing.count + 1
      })
    })

    await prisma.userPoints.deleteMany({
      where: { yearMonth }
    })

    for (const [nickname, data] of Array.from(userPointsMap.entries())) {
      await prisma.userPoints.create({
        data: {
          nickname,
          yearMonth,
          points: data.points,
          homeworkCount: data.count
        }
      })
    }

    await prisma.monthlyPrizePool.update({
      where: { yearMonth },
      data: {
        totalPoints: 0,
        distributed: 0,
        nextCarryOver: 0,
        isSettled: false,
        settledAt: null
      }
    })

    return NextResponse.json({
      success: true,
      message: `结算已取消，已恢复 ${userPointsMap.size} 个用户的积分`
    })

  } catch (error: any) {
    console.error('取消结算失败:', error)
    return NextResponse.json(
      { error: error.message || '取消结算失败' },
      { status: 500 }
    )
  }
}

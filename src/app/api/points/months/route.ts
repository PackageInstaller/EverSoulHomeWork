import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 获取所有有积分记录的月份
    const months = await prisma.monthlyPrizePool.findMany({
      orderBy: { yearMonth: 'desc' },
      select: {
        yearMonth: true,
        totalPoints: true,
        totalPool: true,
        isSettled: true,
        settledAt: true
      }
    })

    return NextResponse.json({
      success: true,
      months
    })

  } catch (error) {
    console.error('获取月份列表失败:', error)
    return NextResponse.json(
      { error: '获取月份列表失败' },
      { status: 500 }
    )
  }
}

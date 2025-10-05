import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { settleMonthlyPrizePool, getCurrentYearMonth } from '@/lib/pointsCalculator'

// 这个API用于定时任务调用，执行自动结算
export async function POST(request: NextRequest) {
  try {
    // 获取配置
    const config = await prisma.autoSettlementConfig.findFirst()
    
    if (!config || !config.enabled) {
      return NextResponse.json({
        success: false,
        message: '自动结算未启用'
      })
    }

    const now = new Date()
    const currentDay = now.getDate()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // 检查是否到达结算时间（允许5分钟误差）
    const isRightDay = currentDay === config.dayOfMonth
    const isRightHour = currentHour === config.hour
    const isRightTime = Math.abs(currentMinute - config.minute) <= 5

    if (!isRightDay || !isRightHour || !isRightTime) {
      return NextResponse.json({
        success: false,
        message: '当前时间不是结算时间'
      })
    }

    // 计算要结算的月份（上个月）
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const yearMonth = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`

    // 检查是否已经结算过
    if (config.lastSettledMonth === yearMonth) {
      return NextResponse.json({
        success: false,
        message: '该月份已经自动结算过'
      })
    }

    // 检查该月份是否已手动结算
    const pool = await prisma.monthlyPrizePool.findUnique({
      where: { yearMonth }
    })

    if (pool?.isSettled) {
      // 更新最后结算月份
      await prisma.autoSettlementConfig.update({
        where: { id: config.id },
        data: { lastSettledMonth: yearMonth }
      })
      
      return NextResponse.json({
        success: false,
        message: '该月份已经手动结算过'
      })
    }

    // 执行结算
    const result = await settleMonthlyPrizePool(yearMonth)

    // 更新最后结算月份
    await prisma.autoSettlementConfig.update({
      where: { id: config.id },
      data: { lastSettledMonth: yearMonth }
    })

    return NextResponse.json({
      success: true,
      message: `自动结算完成: ${yearMonth}`,
      result
    })

  } catch (error: any) {
    console.error('自动结算失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '自动结算失败'
    }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { settleMonthlyPrizePool, getCurrentYearMonth } from '@/lib/pointsCalculator'

export const dynamic = 'force-dynamic'

/**
 * 自动结算定时任务
 * 应该由外部定时任务（如cron job或云函数）定时调用
 * 建议每小时调用一次
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    console.log('⏰ [自动结算] 定时任务开始检查...')

    // 验证请求来源（可选：添加密钥验证）
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key'

    // 如果设置了密钥，需要验证
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${cronSecret}`) {
      console.log('❌ [自动结算] 未授权的请求')
      return NextResponse.json(
        { success: false, error: '未授权' },
        { status: 401 }
      )
    }

    // 获取配置
    const autoSettleHourConfig = await prisma.systemConfig.findUnique({
      where: { key: 'auto_settle_hour' }
    })

    const autoSettleHour = autoSettleHourConfig ? parseInt(autoSettleHourConfig.value) : 23

    // 获取当前时间
    const now = new Date()
    const currentDay = now.getDate()
    const currentHour = now.getHours()
    const currentYearMonth = getCurrentYearMonth()

    // 获取当月最后一天
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

    console.log(`📅 [自动结算] 当前时间: ${now.toLocaleString('zh-CN')}`)
    console.log(`📅 [自动结算] 当前日期: ${currentDay}/${lastDay} (最后一天), 当前小时: ${currentHour}, 结算时间: ${autoSettleHour}`)

    // 检查是否是月底最后一天的指定时间
    if (currentDay !== lastDay) {
      console.log('📆 [自动结算] 今天不是月底最后一天，跳过结算')
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: '今天不是月底最后一天',
        currentDay,
        lastDay,
        duration: `${Date.now() - startTime}ms`
      })
    }

    if (currentHour !== autoSettleHour) {
      console.log(`⏰ [自动结算] 当前时间 ${currentHour}:00 不是结算时间 ${autoSettleHour}:00，跳过结算`)
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: '当前时间不是结算时间',
        currentHour,
        settleHour: autoSettleHour,
        duration: `${Date.now() - startTime}ms`
      })
    }

    // 检查本月是否已经结算
    const existingPool = await prisma.monthlyPrizePool.findUnique({
      where: { yearMonth: currentYearMonth }
    })

    if (existingPool?.isSettled) {
      console.log(`✅ [自动结算] ${currentYearMonth} 已经结算过了，跳过`)
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: '本月已经结算过了',
        yearMonth: currentYearMonth,
        settledAt: existingPool.settledAt,
        duration: `${Date.now() - startTime}ms`
      })
    }

    // 执行结算
    console.log(`💰 [自动结算] 开始执行 ${currentYearMonth} 的自动结算...`)
    const result = await settleMonthlyPrizePool(currentYearMonth)

    const duration = Date.now() - startTime
    console.log(`✅ [自动结算] ${currentYearMonth} 结算完成！耗时: ${duration}ms`)
    console.log(`💰 [自动结算] 总积分: ${result.totalPoints.toFixed(2)}, 总奖池: ${result.totalPool.toFixed(2)}, 发放: ${result.distributed.toFixed(2)}, 累加: ${result.nextCarryOver.toFixed(2)}`)

    return NextResponse.json({
      success: true,
      settled: true,
      yearMonth: currentYearMonth,
      result: {
        totalPoints: Math.round(result.totalPoints * 100) / 100,
        totalPool: Math.round(result.totalPool * 100) / 100,
        distributed: Math.round(result.distributed * 100) / 100,
        nextCarryOver: Math.round(result.nextCarryOver * 100) / 100,
        rewardCount: result.rewards.length
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ [自动结算] 执行失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '自动结算失败',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}


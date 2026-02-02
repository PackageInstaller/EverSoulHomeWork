import { prisma } from './prisma'
import { settleMonthlyPrizePool, getCurrentYearMonth } from './pointsCalculator'

let autoSettleTimer: NodeJS.Timeout | null = null
let lastCheckTime: Date | null = null
let serviceStartTime: Date | null = null

// 导出状态信息
export function getServiceStatus() {
  return {
    isRunning: autoSettleTimer !== null,
    startTime: serviceStartTime?.toISOString(),
    lastCheckTime: lastCheckTime?.toISOString()
  }
}

/**
 * 检查并执行自动结算
 */
async function checkAndSettle() {
  try {
    lastCheckTime = new Date()
    const startTime = Date.now()
    console.error('⏰ [自动结算] 定时检查开始...')  // 使用 console.error 确保日志不被移除

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
    console.log(`📅 [自动结算] 当前日期: ${currentDay}/${lastDay}, 当前小时: ${currentHour}, 结算时间: ${autoSettleHour}`)

    // 检查是否是月底最后一天的指定时间
    if (currentDay !== lastDay) {
      console.log('📆 [自动结算] 今天不是月底最后一天，跳过结算')
      return
    }

    // 修改判断逻辑：允许在结算时间之后的一小时内执行
    // 例如设定23:00结算，那么23:00-23:59都可以执行
    if (currentHour < autoSettleHour) {
      console.log(`⏰ [自动结算] 当前时间 ${currentHour}:00 早于结算时间 ${autoSettleHour}:00，跳过结算`)
      return
    }
    
    if (currentHour > autoSettleHour + 1) {
      console.log(`⏰ [自动结算] 当前时间 ${currentHour}:00 已超过结算时间窗口 ${autoSettleHour}:00-${autoSettleHour + 1}:59，跳过结算`)
      return
    }

    // 检查本月是否已经结算
    const existingPool = await prisma.monthlyPrizePool.findUnique({
      where: { yearMonth: currentYearMonth }
    })

    if (existingPool?.isSettled) {
      console.log(`✅ [自动结算] ${currentYearMonth} 已经结算过了，跳过`)
      return
    }

    // 执行结算
    console.log(`💰 [自动结算] 开始执行 ${currentYearMonth} 的自动结算...`)
    const result = await settleMonthlyPrizePool(currentYearMonth)

    const duration = Date.now() - startTime
    console.log(`✅ [自动结算] ${currentYearMonth} 结算完成！耗时: ${duration}ms`)
    console.log(`💰 [自动结算] 总积分: ${result.totalPoints.toFixed(2)}, 总奖池: ${result.totalPool.toFixed(2)}, 发放: ${result.distributed.toFixed(2)}, 累加: ${result.nextCarryOver.toFixed(2)}`)

  } catch (error: any) {
    console.error('❌ [自动结算] 执行失败:', error)
  }
}

/**
 * 启动自动结算服务
 */
export function startAutoSettleService() {
  if (autoSettleTimer) {
    console.error('⚠️ [自动结算] 服务已在运行中')
    return
  }

  serviceStartTime = new Date()
  console.error(`🚀 [自动结算] 服务启动于 ${serviceStartTime.toISOString()}`)

  // 每小时检查一次
  autoSettleTimer = setInterval(() => {
    checkAndSettle().catch(err => {
      console.error('❌ [自动结算] 检查失败:', err)
    })
  }, 60 * 60 * 1000) // 1小时

  // 启动时立即检查一次
  checkAndSettle().catch(err => {
    console.error('❌ [自动结算] 初始检查失败:', err)
  })
}

/**
 * 停止自动结算服务
 */
export function stopAutoSettleService() {
  if (autoSettleTimer) {
    clearInterval(autoSettleTimer)
    autoSettleTimer = null
    console.log('🛑 [自动结算] 服务已停止')
  }
}


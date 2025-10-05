/**
 * 自动结算服务
 * 在服务器启动时自动运行，每分钟检查一次是否需要执行结算
 */

import { prisma } from './prisma'
import { settleMonthlyPrizePool } from './pointsCalculator'

let isRunning = false
let checkInterval: NodeJS.Timeout | null = null

/**
 * 获取当前年月标识
 */
function getCurrentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 获取上个月的年月标识
 */
function getPreviousYearMonth(): string {
  const now = new Date()
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const month = now.getMonth() === 0 ? 12 : now.getMonth()
  return `${year}-${String(month).padStart(2, '0')}`
}

/**
 * 检查并执行自动结算
 */
async function checkAndSettle() {
  try {
    // 获取自动结算配置
    const config = await prisma.autoSettlementConfig.findFirst()
    
    if (!config || !config.enabled) {
      return
    }

    const now = new Date()
    const currentDay = now.getDate()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentYearMonth = getCurrentYearMonth()
    
    // 检查是否到达结算时间
    const shouldSettle = (
      currentDay === config.dayOfMonth &&
      currentHour === config.hour &&
      currentMinute === config.minute
    )
    
    if (!shouldSettle) {
      return
    }
    
    // 检查本月是否已经结算过
    if (config.lastSettledMonth === currentYearMonth) {
      console.log(`[自动结算] ${currentYearMonth} 已经结算过，跳过`)
      return
    }
    
    // 执行结算（结算上个月）
    const previousMonth = getPreviousYearMonth()
    
    console.log(`[自动结算] 开始结算 ${previousMonth}`)
    
    const result = await settleMonthlyPrizePool(previousMonth)
    
    // 更新最后结算月份
    await prisma.autoSettlementConfig.update({
      where: { id: config.id },
      data: {
        lastSettledMonth: currentYearMonth
      }
    })
    
    console.log(`[自动结算] ${previousMonth} 结算完成:`, {
      totalPoints: result.totalPoints,
      distributed: result.distributed,
      nextCarryOver: result.nextCarryOver
    })
    
  } catch (error) {
    console.error('[自动结算] 执行失败:', error)
  }
}

/**
 * 启动自动结算服务
 */
export function startAutoSettlementService() {
  if (isRunning) {
    console.log('[自动结算服务] 已在运行中')
    return
  }
  
  console.log('[自动结算服务] 正在启动...')
  isRunning = true
  
  // 立即执行一次检查
  checkAndSettle().catch(err => {
    console.error('[自动结算服务] 初始检查失败:', err)
  })
  
  // 每分钟检查一次
  checkInterval = setInterval(() => {
    checkAndSettle().catch(err => {
      console.error('[自动结算服务] 定时检查失败:', err)
    })
  }, 60 * 1000) // 60秒
  
  console.log('[自动结算服务] 已启动，每分钟检查一次')
}

/**
 * 停止自动结算服务
 */
export function stopAutoSettlementService() {
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
    isRunning = false
    console.log('[自动结算服务] 已停止')
  }
}

/**
 * 获取服务状态
 */
export function getServiceStatus() {
  return {
    isRunning,
    checkIntervalMs: 60 * 1000
  }
}

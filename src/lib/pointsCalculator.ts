import { prisma } from './prisma'

/**
 * 获取当前年月标识
 */
export function getCurrentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 解析关卡ID，获取区域编号
 * @param stageId 关卡ID，如 "19-1"
 * @returns 区域编号
 */
export function getAreaNumber(stageId: string): number {
  const parts = stageId.split('-')
  return parseInt(parts[0], 10)
}

/**
 * 检查关卡是否有已审核通过的作业
 * @param stageId 关卡ID
 * @param excludeHomeworkId 要排除的作业ID（当前作业）
 * @returns 是否已有作业
 */
export async function hasApprovedHomework(
  stageId: string, 
  excludeHomeworkId?: string
): Promise<boolean> {
  const count = await prisma.userHomework.count({
    where: {
      stageId,
      status: 'approved',
      ...(excludeHomeworkId ? { id: { not: excludeHomeworkId } } : {})
    }
  })
  return count > 0
}

/**
 * 计算作业积分
 * @param stageId 关卡ID
 * @param teamCount 队伍数量
 * @param homeworkId 作业ID（用于排除自己）
 * @returns 积分和是否减半
 */
export async function calculateHomeworkPoints(
  stageId: string,
  teamCount: number,
  homeworkId?: string
): Promise<{ points: number; isHalved: boolean }> {
  // 检查是否是19图及以后
  const areaNumber = getAreaNumber(stageId)
  if (areaNumber < 19) {
    return { points: 0, isHalved: false }
  }

  // 基础积分规则
  let basePoints = 0
  if (teamCount === 1) {
    basePoints = 0.1
  } else if (teamCount === 2) {
    basePoints = 0.5
  } else if (teamCount === 3) {
    basePoints = 1.0
  }

  // 检查是否已有作业（减半规则）
  const hasExisting = await hasApprovedHomework(stageId, homeworkId)
  const isHalved = hasExisting
  const finalPoints = isHalved ? basePoints / 2 : basePoints

  return { points: finalPoints, isHalved }
}

/**
 * 为用户添加积分
 * 如果当月已结算，积分只计入总榜（PointsHistory），不计入月度奖池（UserPoints）
 */
export async function addPointsToUser(
  nickname: string,
  homeworkId: string,
  stageId: string,
  teamCount: number,
  points: number,
  isHalved: boolean,
  yearMonth?: string
) {
  const ym = yearMonth || getCurrentYearMonth()

  // 检查当月是否已结算
  const settled = await isMonthSettled(ym)

  if (!settled) {
    // 未结算：积分计入月度奖池
    await prisma.userPoints.upsert({
      where: {
        nickname_yearMonth: {
          nickname,
          yearMonth: ym
        }
      },
      update: {
        points: {
          increment: points
        },
        homeworkCount: {
          increment: 1
        }
      },
      create: {
        nickname,
        yearMonth: ym,
        points,
        homeworkCount: 1
      }
    })
    console.log(`✅ [积分] ${nickname} 在 ${ym} 获得 ${points} 积分（计入月度奖池）`)
  } else {
    console.log(`⚠️ [积分] ${nickname} 在 ${ym} 获得 ${points} 积分（当月已结算，仅计入总榜）`)
  }

  // 始终添加积分历史记录（用于总榜统计）
  await prisma.pointsHistory.create({
    data: {
      nickname,
      homeworkId,
      stageId,
      teamCount,
      points,
      isHalved,
      yearMonth: ym
    }
  })
}

/**
 * 获取基础奖池配置
 */
async function getBasePoolAmount(): Promise<number> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'base_prize_pool' }
    })
    return config ? parseFloat(config.value) : 200
  } catch (error) {
    console.error('获取基础奖池配置失败，使用默认值200:', error)
    return 200
  }
}

/**
 * 检查指定年月是否已结算
 */
async function isMonthSettled(yearMonth: string): Promise<boolean> {
  try {
    const pool = await prisma.monthlyPrizePool.findUnique({
      where: { yearMonth }
    })
    return pool?.isSettled || false
  } catch (error) {
    console.error('检查月度结算状态失败:', error)
    return false
  }
}

/**
 * 从用户扣除积分（当作业被取消通过时）
 */
export async function removePointsFromUser(
  nickname: string,
  homeworkId: string
) {
  try {
    // 查找该作业的积分历史记录
    const pointsHistory = await prisma.pointsHistory.findFirst({
      where: {
        nickname,
        homeworkId
      }
    })

    if (!pointsHistory) {
      console.log(`未找到作业 ${homeworkId} 的积分记录`)
      return
    }

    const { yearMonth, points } = pointsHistory

    // 删除积分历史记录
    await prisma.pointsHistory.delete({
      where: {
        id: pointsHistory.id
      }
    })

    // 更新用户积分
    const userPoints = await prisma.userPoints.findUnique({
      where: {
        nickname_yearMonth: {
          nickname,
          yearMonth
        }
      }
    })

    if (userPoints) {
      const newPoints = Math.max(0, userPoints.points - points)
      const newHomeworkCount = Math.max(0, userPoints.homeworkCount - 1)

      if (newPoints === 0 && newHomeworkCount === 0) {
        // 如果积分和作业数都为0，删除记录
        await prisma.userPoints.delete({
          where: {
            id: userPoints.id
          }
        })
        console.log(`用户 ${nickname} 在 ${yearMonth} 的积分记录已删除（积分归零）`)
      } else {
        // 更新积分记录
        await prisma.userPoints.update({
          where: {
            id: userPoints.id
          },
          data: {
            points: newPoints,
            homeworkCount: newHomeworkCount
          }
        })
        console.log(`用户 ${nickname} 扣除 ${points} 积分，当前: ${newPoints}`)
      }
    }

    // 更新月度奖池的总积分
    const prizePool = await prisma.monthlyPrizePool.findUnique({
      where: { yearMonth }
    })

    if (prizePool && !prizePool.isSettled) {
      await prisma.monthlyPrizePool.update({
        where: { yearMonth },
        data: {
          totalPoints: Math.max(0, prizePool.totalPoints - points)
        }
      })
    }

  } catch (error) {
    console.error('扣除积分失败:', error)
    throw error
  }
}

/**
 * 获取或创建月度奖池
 */
export async function getOrCreateMonthlyPrizePool(yearMonth: string) {
  // 查找现有奖池
  let pool = await prisma.monthlyPrizePool.findUnique({
    where: { yearMonth }
  })

  if (!pool) {
    // 获取基础奖池配置
    const basePool = await getBasePoolAmount()
    
    // 获取上个月的奖池，检查是否有累加
    const prevYearMonth = getPreviousYearMonth(yearMonth)
    const prevPool = await prisma.monthlyPrizePool.findUnique({
      where: { yearMonth: prevYearMonth }
    })

    const carryOver = prevPool?.nextCarryOver || 0

    // 创建新奖池
    pool = await prisma.monthlyPrizePool.create({
      data: {
        yearMonth,
        basePool,
        carryOver,
        totalPool: basePool + carryOver
      }
    })
  } else if (!pool.isSettled) {
    // 如果奖池存在且未结算，检查是否需要更新基础奖池金额
    const currentBasePool = await getBasePoolAmount()
    
    if (pool.basePool !== currentBasePool) {
      console.log(`📊 [月度奖池] ${yearMonth} 基础奖池从 ¥${pool.basePool} 更新为 ¥${currentBasePool}`)
      
      // 更新基础奖池和总奖池
      pool = await prisma.monthlyPrizePool.update({
        where: { yearMonth },
        data: {
          basePool: currentBasePool,
          totalPool: currentBasePool + pool.carryOver
        }
      })
    }
  }

  return pool
}

/**
 * 获取上个月的年月标识
 */
function getPreviousYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  date.setMonth(date.getMonth() - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 月度结算
 */
export async function settleMonthlyPrizePool(yearMonth: string) {
  // 获取奖池
  const pool = await getOrCreateMonthlyPrizePool(yearMonth)
  
  if (pool.isSettled) {
    throw new Error('该月份已经结算过了')
  }

  // 计算总积分
  const userPoints = await prisma.userPoints.findMany({
    where: { yearMonth }
  })

  const totalPoints = userPoints.reduce((sum, up) => sum + up.points, 0)
  const totalPool = pool.totalPool

  let distributed = 0
  let nextCarryOver = 0

  if (totalPoints === 0) {
    // 没有积分，全部累加到下个月
    nextCarryOver = totalPool
  } else if (totalPoints < 200) {
    // 总积分不足200，按1:1发放，剩余累加到下个月
    distributed = totalPoints
    nextCarryOver = totalPool - totalPoints
  } else if (totalPoints >= 200 && totalPoints < totalPool) {
    // 总积分高于200但小于总奖池，按1:1发放，剩余也累加到下个月
    distributed = totalPoints
    nextCarryOver = totalPool - totalPoints  // 修复：剩余也应该累加
  } else {
    // 总积分大于等于总奖池，按比例分配
    distributed = totalPool
    nextCarryOver = 0
  }

  // 更新奖池记录
  await prisma.monthlyPrizePool.update({
    where: { yearMonth },
    data: {
      totalPoints,
      distributed,
      nextCarryOver,
      isSettled: true,
      settledAt: new Date()
    }
  })

  // 计算并返回每个用户的奖励
  const rewards = userPoints.map(up => {
    let reward = 0
    if (totalPoints > 0) {
      if (totalPoints < totalPool) {
        // 1:1发放
        reward = up.points
      } else {
        // 按比例分配
        reward = (up.points / totalPoints) * totalPool
      }
    }
    return {
      nickname: up.nickname,
      points: up.points,
      reward: Math.round(reward * 100) / 100 // 保留2位小数
    }
  }).sort((a, b) => b.points - a.points) // 按积分排序

  return {
    yearMonth,
    totalPoints,
    totalPool,
    distributed,
    nextCarryOver,
    rewards
  }
}

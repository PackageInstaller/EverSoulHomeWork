import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 验证管理员会话
async function validateAdminSession(request: NextRequest) {
  const sessionToken = request.cookies.get('admin_session')?.value;

  if (!sessionToken) {
    return false;
  }

  try {
    const decoded = Buffer.from(sessionToken, 'base64').toString();
    const [user, timestamp] = decoded.split(':');
    
    if (user !== 'admin') {
      return false;
    }

    const tokenTime = parseInt(timestamp);
    const currentTime = Date.now();
    const oneHour = 3600000; // 1小时的毫秒数

    if (currentTime - tokenTime > oneHour) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

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

    // 取消结算：需要恢复积分
    console.log(`⚠️ [取消结算] 开始取消 ${yearMonth} 的结算...`)
    
    // 1. 获取该月所有积分历史
    const pointsHistories = await prisma.pointsHistory.findMany({
      where: { yearMonth }
    })
    
    console.log(`📊 [取消结算] 找到 ${pointsHistories.length} 条积分记录`)
    
    // 2. 按用户分组统计
    const userPointsMap = new Map<string, { points: number, count: number }>()
    pointsHistories.forEach(history => {
      const existing = userPointsMap.get(history.nickname) || { points: 0, count: 0 }
      userPointsMap.set(history.nickname, {
        points: existing.points + history.points,
        count: existing.count + 1
      })
    })
    
    console.log(`👥 [取消结算] 涉及 ${userPointsMap.size} 个用户`)
    
    // 3. 删除旧的UserPoints记录
    await prisma.userPoints.deleteMany({
      where: { yearMonth }
    })
    
    console.log(`🗑️ [取消结算] 已删除旧的用户积分记录`)
    
    // 4. 重新创建UserPoints记录（包括结算后提交的作业）
    for (const [nickname, data] of userPointsMap.entries()) {
      await prisma.userPoints.create({
        data: {
          nickname,
          yearMonth,
          points: data.points,
          homeworkCount: data.count
        }
      })
    }
    
    console.log(`✅ [取消结算] 已恢复所有用户积分记录`)
    
    // 5. 重置奖池状态
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
    
    console.log(`✅ [取消结算] ${yearMonth} 结算已取消完成！`)

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

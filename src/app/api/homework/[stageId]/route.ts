import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * 获取年月标识
 */
function getYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: { stageId: string } }
) {
  try {
    const { stageId } = params

    // 验证关卡ID格式
    if (!/^\d+-\d+$/.test(stageId)) {
      return NextResponse.json(
        { error: '关卡ID格式不正确' },
        { status: 400 }
      )
    }

    // 获取已审核通过的作业
    const homeworks = await prisma.userHomework.findMany({
      where: {
        stageId,
        status: 'approved'
      },
      include: {
        images: {
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 获取所有涉及的yearMonth及其结算信息
    const yearMonths = Array.from(new Set(homeworks.map(hw => getYearMonth(new Date(hw.createdAt)))))
    const prizePoolsMap = new Map()
    
    if (yearMonths.length > 0) {
      const prizePools = await prisma.monthlyPrizePool.findMany({
        where: {
          yearMonth: {
            in: yearMonths
          }
        }
      })
      
      prizePools.forEach(pool => {
        prizePoolsMap.set(pool.yearMonth, pool)
      })
    }

    // 获取作业的积分历史记录（包含 isHalved 信息）
    const homeworkIds = homeworks.map(hw => hw.id)
    const pointsHistoryMap = new Map()
    
    if (homeworkIds.length > 0) {
      const pointsHistories = await prisma.pointsHistory.findMany({
        where: {
          homeworkId: {
            in: homeworkIds
          }
        }
      })
      
      pointsHistories.forEach(history => {
        pointsHistoryMap.set(history.homeworkId, history)
      })
    }

    return NextResponse.json({
      success: true,
      homeworks: homeworks.map((homework: { id: any; nickname: any; description: any; teamCount: any; createdAt: any; updatedAt: any; images: any[]; }) => {
        const yearMonth = getYearMonth(new Date(homework.createdAt))
        const prizePool = prizePoolsMap.get(yearMonth)
        const isAfterSettlement = prizePool?.isSettled && prizePool.settledAt && 
                                 new Date(homework.createdAt) > new Date(prizePool.settledAt)
        
        // 获取积分历史记录中的 isHalved 信息
        const pointsHistory = pointsHistoryMap.get(homework.id)
        const isHalved = pointsHistory?.isHalved || false
        
        return {
          id: homework.id,
          nickname: homework.nickname,
          description: homework.description,
          teamCount: homework.teamCount,
          createdAt: homework.createdAt,
          isAfterSettlement, // 是否在结算后提交
          isHalved, // 是否减半
          images: homework.images.map((img: { id: any; filename: any; originalName: any; order: any; }) => ({
            id: img.id,
            filename: img.filename,
            originalName: img.originalName,
            order: img.order,
            url: `/api/uploads/homework/${img.filename}`
          }))
        }
      })
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('获取作业失败:', error)
    return NextResponse.json(
      { error: '获取作业失败' },
      { status: 500 }
    )
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * 获取年月标识
 */
function getYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nickname = searchParams.get('nickname')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!nickname) {
      return NextResponse.json(
        { error: '缺少昵称参数' },
        { status: 400 }
      )
    }

    // 计算跳过的记录数
    const skip = (page - 1) * limit

    // 获取该玩家的所有已审核作业
    const [homeworks, total] = await Promise.all([
      prisma.userHomework.findMany({
        where: {
          nickname,
          status: 'approved'
        },
        include: {
          images: {
            orderBy: {
              order: 'asc'
            },
            take: 1 // 只获取第一张图片作为缩略图
          }
        },
        orderBy: [
          { stageId: 'asc' } // 按关卡ID排序
        ],
        skip,
        take: limit
      }),
      prisma.userHomework.count({
        where: {
          nickname,
          status: 'approved'
        }
      })
    ])

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

    // 按区域分组
    const groupedByArea: { [key: string]: typeof homeworks } = {}
    homeworks.forEach(hw => {
      const area = hw.stageId.split('-')[0]
      if (!groupedByArea[area]) {
        groupedByArea[area] = []
      }
      groupedByArea[area].push(hw)
    })

    return NextResponse.json({
      success: true,
      nickname,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      homeworks: homeworks.map(hw => {
        const yearMonth = getYearMonth(new Date(hw.createdAt))
        const prizePool = prizePoolsMap.get(yearMonth)
        const isAfterSettlement = prizePool?.isSettled && prizePool.settledAt && 
                                 new Date(hw.createdAt) > new Date(prizePool.settledAt)
        
        // 获取积分历史记录中的 isHalved 信息
        const pointsHistory = pointsHistoryMap.get(hw.id)
        const isHalved = pointsHistory?.isHalved || false
        
        return {
          id: hw.id,
          stageId: hw.stageId,
          description: hw.description,
          teamCount: hw.teamCount,
          createdAt: hw.createdAt,
          isAfterSettlement, // 是否在结算后提交
          isHalved, // 是否减半
          thumbnail: hw.images[0] ? `/api/uploads/homework/${hw.images[0].filename}` : null
        }
      }),
      groupedByArea: Object.keys(groupedByArea).sort((a, b) => parseInt(a) - parseInt(b)).map(area => ({
        area: parseInt(area),
        stages: groupedByArea[area].map(hw => ({
          stageId: hw.stageId,
          thumbnail: hw.images[0] ? `/api/uploads/homework/${hw.images[0].filename}` : null
        }))
      }))
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('获取玩家作业失败:', error)
    return NextResponse.json(
      { error: '获取作业失败' },
      { status: 500 }
    )
  }
}

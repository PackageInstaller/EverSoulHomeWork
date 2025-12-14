import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateHomeworkPoints, addPointsToUser } from '@/lib/pointsCalculator'
import { validateAdminSession } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * 批量审核作业
 * POST /api/admin/homework/batch-approve
 * Body: { homeworkIds: string[], status: 'approved' | 'rejected', rejectReason?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const isValid = await validateAdminSession(request);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const { homeworkIds, status, rejectReason } = await request.json()

    // 验证参数
    if (!homeworkIds || !Array.isArray(homeworkIds) || homeworkIds.length === 0) {
      return NextResponse.json(
        { error: '请选择至少一个作业' },
        { status: 400 }
      )
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: '无效的状态值' },
        { status: 400 }
      )
    }

    // 获取所有作业
    const homeworks = await prisma.userHomework.findMany({
      where: {
        id: { in: homeworkIds }
      },
      include: {
        images: true
      }
    })

    if (homeworks.length === 0) {
      return NextResponse.json(
        { error: '未找到作业' },
        { status: 404 }
      )
    }

    const results = []
    const userMessages: Record<string, { userId: string; stages: string[]; totalPoints: number; details: Array<{stageId: string; points: number; isHalved: boolean}> }> = {}

    // 处理每个作业
    for (const homework of homeworks) {
      try {
        // 获取原始状态
        const originalStatus = homework.status

        // 更新作业状态
        await prisma.userHomework.update({
          where: { id: homework.id },
          data: { 
            status,
            updatedAt: new Date()
          }
        })

        let pointsInfo = null

        // 如果是批准操作且原来不是approved状态
        if (status === 'approved' && originalStatus !== 'approved') {
          try {
            const { points, isHalved } = await calculateHomeworkPoints(
              homework.stageId,
              homework.teamCount,
              homework.id
            )

            if (points > 0) {
              await addPointsToUser(
                homework.nickname,
                homework.id,
                homework.stageId,
                homework.teamCount,
                points,
                isHalved
              )

              pointsInfo = {
                action: 'added',
                points,
                isHalved,
                message: `获得${points}积分${isHalved ? '（已有作业，减半）' : ''}`
              }

              // 收集消息信息（按用户分组）
              const user = await prisma.user.findFirst({
                where: { nickname: homework.nickname },
                select: { id: true }
              })

              if (user) {
                if (!userMessages[user.id]) {
                  userMessages[user.id] = {
                    userId: user.id,
                    stages: [],
                    totalPoints: 0,
                    details: []
                  }
                }
                userMessages[user.id].stages.push(homework.stageId)
                userMessages[user.id].totalPoints += points
                userMessages[user.id].details.push({
                  stageId: homework.stageId,
                  points,
                  isHalved
                })
              }
            }
          } catch (error) {
            console.error(`计算作业 ${homework.id} 积分失败:`, error)
          }
        }

        results.push({
          id: homework.id,
          stageId: homework.stageId,
          success: true,
          points: pointsInfo
        })
      } catch (error) {
        console.error(`处理作业 ${homework.id} 失败:`, error)
        results.push({
          id: homework.id,
          stageId: homework.stageId,
          success: false,
          error: '处理失败'
        })
      }
    }

    // 发送合并的消息
    if (status === 'approved') {
      for (const [userId, messageData] of Object.entries(userMessages)) {
        try {
          let title: string
          let content: string

          if (messageData.stages.length === 1) {
            // 单个作业
            const detail = messageData.details[0]
            title = '✅ 作业已通过审核'
            content = `您在关卡 ${detail.stageId} 提交的作业已通过审核，获得 ${detail.points} 积分${detail.isHalved ? '（已有作业，减半）' : ''}！`
          } else {
            // 多个作业，合并消息
            title = `✅ ${messageData.stages.length} 个作业已通过审核`
            
            // 构建详细列表
            const detailsList = messageData.details.map(d => 
              `- 关卡 ${d.stageId}: ${d.points} 积分${d.isHalved ? '（减半）' : ''}`
            ).join('\n')
            
            content = `恭喜！您提交的 ${messageData.stages.length} 个作业已全部通过审核：\n\n${detailsList}\n\n总计获得 ${messageData.totalPoints.toFixed(2)} 积分！`
          }

          await prisma.message.create({
            data: {
              userId: messageData.userId,
              senderId: null,
              type: 'system',
              title,
              content,
              isRead: false
            }
          })
        } catch (error) {
          console.error(`发送消息给用户 ${userId} 失败:`, error)
        }
      }
    }

    // 如果是拒绝操作，发送拒绝消息
    if (status === 'rejected' && rejectReason && rejectReason.trim()) {
      // 按用户分组拒绝的作业
      const rejectMessages: Record<string, { userId: string; stages: string[] }> = {}
      
      for (const homework of homeworks) {
        try {
          const user = await prisma.user.findFirst({
            where: { nickname: homework.nickname },
            select: { id: true }
          })

          if (user) {
            if (!rejectMessages[user.id]) {
              rejectMessages[user.id] = {
                userId: user.id,
                stages: []
              }
            }
            rejectMessages[user.id].stages.push(homework.stageId)
          }
        } catch (error) {
          console.error(`查找用户失败:`, error)
        }
      }

      // 发送拒绝消息
      for (const [userId, messageData] of Object.entries(rejectMessages)) {
        try {
          let title: string
          let content: string

          if (messageData.stages.length === 1) {
            title = `作业被拒绝：关卡 ${messageData.stages[0]}`
            content = `您提交的关卡 ${messageData.stages[0]} 作业已被拒绝。\n\n拒绝原因：\n${rejectReason.trim()}`
          } else {
            title = `${messageData.stages.length} 个作业被拒绝`
            const stagesList = messageData.stages.map(s => `- 关卡 ${s}`).join('\n')
            content = `您提交的以下作业已被拒绝：\n\n${stagesList}\n\n拒绝原因：\n${rejectReason.trim()}`
          }

          await prisma.message.create({
            data: {
              userId: messageData.userId,
              senderId: null,
              type: 'admin',
              title,
              content,
              isRead: false
            }
          })
        } catch (error) {
          console.error(`发送拒绝消息给用户 ${userId} 失败:`, error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `成功处理 ${results.filter(r => r.success).length}/${results.length} 个作业`,
      results
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('批量审核作业失败:', error)
    return NextResponse.json(
      { error: '批量审核作业失败' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import path from 'path'
import { calculateHomeworkPoints, addPointsToUser, removePointsFromUser } from '@/lib/pointsCalculator'

export const dynamic = 'force-dynamic'

const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/homework')

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

// 更新作业状态
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    const isValid = await validateAdminSession(request);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const { id } = params
    const { status, rejectReason } = await request.json()

    // 验证状态值
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: '无效的状态值' },
        { status: 400 }
      )
    }

    // 获取原始作业状态
    const originalHomework = await prisma.userHomework.findUnique({
      where: { id }
    })

    if (!originalHomework) {
      return NextResponse.json(
        { error: '作业不存在' },
        { status: 404 }
      )
    }

    // 更新作业状态
    const homework = await prisma.userHomework.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date()
      },
      include: {
        images: true
      }
    })

    // 如果是拒绝操作且提供了拒绝原因，发送邮件通知用户
    if (status === 'rejected' && rejectReason && rejectReason.trim()) {
      try {
        // 通过nickname查找用户
        const user = await prisma.user.findFirst({
          where: { nickname: homework.nickname }
        });

        if (user) {
          // 创建邮件消息
          await prisma.message.create({
            data: {
              userId: user.id,
              senderId: null, // 管理员消息
              type: 'admin',
              title: `作业被拒绝：关卡 ${homework.stageId}`,
              content: `您提交的关卡 ${homework.stageId} 作业已被拒绝。\n\n拒绝原因：\n${rejectReason.trim()}`,
              isRead: false,
            },
          });
        }
      } catch (error) {
        console.error('发送拒绝通知失败:', error);
        // 发送通知失败不影响作业状态更新
      }
    }

    // 积分变动信息
    let pointsInfo = null

    // 如果从approved状态变为其他状态，扣除积分
    if (originalHomework.status === 'approved' && status !== 'approved') {
      try {
        await removePointsFromUser(
          homework.nickname,
          homework.id
        )

        pointsInfo = {
          action: 'removed',
          message: '积分已扣除'
        }
      } catch (error) {
        console.error('扣除积分失败:', error)
        // 积分扣除失败不影响作业状态更新
      }
    }

    // 如果从非approved状态变为approved，计算并添加积分
    if (originalHomework.status !== 'approved' && status === 'approved') {
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

          // 发送系统消息通知用户
          try {
            // 通过昵称查找用户ID
            const user = await prisma.user.findFirst({
              where: { nickname: homework.nickname },
              select: { id: true }
            });

            if (user) {
              await prisma.message.create({
                data: {
                  userId: user.id,
                  senderId: null,
                  type: 'system',
                  title: '✅ 作业已通过审核',
                  content: `您在关卡 ${homework.stageId} 提交的作业已通过审核，获得 ${points} 积分${isHalved ? '（已有作业，减半）' : ''}！`,
                  isRead: false
                }
              });
            }
          } catch (error) {
            console.error('发送系统消息失败:', error);
            // 消息发送失败不影响作业审核
          }
        }
      } catch (error) {
        console.error('计算积分失败:', error)
        // 积分计算失败不影响作业审核
      }
    }

    return NextResponse.json({
      success: true,
      homework: {
        id: homework.id,
        stageId: homework.stageId,
        nickname: homework.nickname,
        description: homework.description,
        status: homework.status,
        updatedAt: homework.updatedAt
      },
      points: pointsInfo
    })

  } catch (error) {
    console.error('更新作业状态失败:', error)
    return NextResponse.json(
      { error: '更新作业状态失败' },
      { status: 500 }
    )
  }
}

// 删除作业
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    const isValid = await validateAdminSession(request);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const { id } = params

    // 获取作业及其图片信息
    const homework = await prisma.userHomework.findUnique({
      where: { id },
      include: {
        images: true
      }
    })

    if (!homework) {
      return NextResponse.json(
        { error: '作业不存在' },
        { status: 404 }
      )
    }

    // 如果作业是已通过状态，先扣除积分
    if (homework.status === 'approved') {
      try {
        await removePointsFromUser(
          homework.nickname,
          homework.id
        )
        console.log(`删除已通过作业，已扣除 ${homework.nickname} 的积分`)
      } catch (error) {
        console.error('删除作业时扣除积分失败:', error)
        // 继续删除流程
      }
    }

    // 删除图片文件
    for (const image of homework.images) {
      try {
        const filepath = path.join(UPLOAD_DIR, image.filename)
        await unlink(filepath)
      } catch (error) {
        console.warn(`删除图片文件失败: ${image.filename}`, error)
      }
    }

    // 删除数据库记录（会级联删除图片记录）
    await prisma.userHomework.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: '作业删除成功'
    })

  } catch (error) {
    console.error('删除作业失败:', error)
    return NextResponse.json(
      { error: '删除作业失败' },
      { status: 500 }
    )
  }
} 
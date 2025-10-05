import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import path from 'path'

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
    const { status } = await request.json()

    // 验证状态值
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: '无效的状态值' },
        { status: 400 }
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

    return NextResponse.json({
      success: true,
      homework: {
        id: homework.id,
        stageId: homework.stageId,
        nickname: homework.nickname,
        description: homework.description,
        status: homework.status,
        updatedAt: homework.updatedAt
      }
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
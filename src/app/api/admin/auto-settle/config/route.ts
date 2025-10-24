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
    const oneHour = 3600000;

    if (currentTime - tokenTime > oneHour) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// 获取自动结算配置
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const isValid = await validateAdminSession(request)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 401 }
      )
    }

    // 获取配置
    const autoSettleHourConfig = await prisma.systemConfig.findUnique({
      where: { key: 'auto_settle_hour' }
    })

    const config = {
      autoSettleHour: autoSettleHourConfig ? parseInt(autoSettleHourConfig.value) : 23,
    }

    return NextResponse.json({
      success: true,
      config
    })
  } catch (error: any) {
    console.error('获取自动结算配置失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '获取配置失败' },
      { status: 500 }
    )
  }
}

// 设置自动结算配置
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const isValid = await validateAdminSession(request)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 401 }
      )
    }

    const { autoSettleHour } = await request.json()

    // 验证参数
    if (autoSettleHour === undefined || autoSettleHour < 0 || autoSettleHour > 23) {
      return NextResponse.json(
        { success: false, message: '结算时间必须在0-23之间' },
        { status: 400 }
      )
    }

    // 保存配置
    await prisma.systemConfig.upsert({
      where: { key: 'auto_settle_hour' },
      update: { 
        value: autoSettleHour.toString(),
        description: '每月最后一天自动结算的小时数'
      },
      create: { 
        key: 'auto_settle_hour', 
        value: autoSettleHour.toString(),
        description: '每月最后一天自动结算的小时数'
      }
    })

    return NextResponse.json({
      success: true,
      message: '自动结算配置已保存'
    })
  } catch (error: any) {
    console.error('保存自动结算配置失败:', error)
    return NextResponse.json(
      { success: false, message: error.message || '保存配置失败' },
      { status: 500 }
    )
  }
}


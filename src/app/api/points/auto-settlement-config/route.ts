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

// 获取自动结算配置
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const isValid = await validateAdminSession(request)
    if (!isValid) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 401 }
      )
    }

    // 获取配置（如果不存在则创建默认配置）
    let config = await prisma.autoSettlementConfig.findFirst()
    
    if (!config) {
      config = await prisma.autoSettlementConfig.create({
        data: {
          enabled: false,
          dayOfMonth: 1,
          hour: 0,
          minute: 0
        }
      })
    }

    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        enabled: config.enabled,
        dayOfMonth: config.dayOfMonth,
        hour: config.hour,
        minute: config.minute,
        lastSettledMonth: config.lastSettledMonth
      }
    })

  } catch (error) {
    console.error('获取自动结算配置失败:', error)
    return NextResponse.json(
      { error: '获取配置失败' },
      { status: 500 }
    )
  }
}

// 更新自动结算配置
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

    const { enabled, dayOfMonth, hour, minute } = await request.json()

    // 验证参数
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled 必须是布尔值' },
        { status: 400 }
      )
    }

    if (dayOfMonth < 1 || dayOfMonth > 28) {
      return NextResponse.json(
        { error: '日期必须在 1-28 之间' },
        { status: 400 }
      )
    }

    if (hour < 0 || hour > 23) {
      return NextResponse.json(
        { error: '小时必须在 0-23 之间' },
        { status: 400 }
      )
    }

    if (minute < 0 || minute > 59) {
      return NextResponse.json(
        { error: '分钟必须在 0-59 之间' },
        { status: 400 }
      )
    }

    // 获取或创建配置
    let config = await prisma.autoSettlementConfig.findFirst()
    
    if (!config) {
      config = await prisma.autoSettlementConfig.create({
        data: {
          enabled,
          dayOfMonth,
          hour,
          minute
        }
      })
    } else {
      config = await prisma.autoSettlementConfig.update({
        where: { id: config.id },
        data: {
          enabled,
          dayOfMonth,
          hour,
          minute
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: '配置已更新',
      config: {
        id: config.id,
        enabled: config.enabled,
        dayOfMonth: config.dayOfMonth,
        hour: config.hour,
        minute: config.minute
      }
    })

  } catch (error: any) {
    console.error('更新自动结算配置失败:', error)
    return NextResponse.json(
      { error: error.message || '更新配置失败' },
      { status: 500 }
    )
  }
}

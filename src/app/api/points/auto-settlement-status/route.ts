import { NextRequest, NextResponse } from 'next/server'
import { getServiceStatus } from '@/lib/autoSettlementService'

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

    const status = getServiceStatus()
    const now = new Date()

    return NextResponse.json({
      success: true,
      status: {
        ...status,
        serverTime: now.toISOString(),
        serverTimeLocal: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
      }
    })

  } catch (error) {
    console.error('获取自动结算服务状态失败:', error)
    return NextResponse.json(
      { error: '获取状态失败' },
      { status: 500 }
    )
  }
}

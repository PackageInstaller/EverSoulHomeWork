import { NextRequest, NextResponse } from 'next/server'
import { validateAdminSession } from '@/lib/adminAuth'
import { getServiceStatus } from '@/lib/autoSettleService'

export const dynamic = 'force-dynamic'

// 获取自动结算服务状态
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

    const serviceStatus = getServiceStatus()

    // 返回状态信息
    return NextResponse.json({
      success: true,
      status: {
        ...serviceStatus,
        message: serviceStatus.isRunning 
          ? '自动结算服务正在运行' 
          : '自动结算服务未运行',
        note: '服务每小时检查一次，在每月最后一天的指定时间执行结算',
        processUptime: `${Math.floor(process.uptime())}秒`,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '获取状态失败' },
      { status: 500 }
    )
  }
}


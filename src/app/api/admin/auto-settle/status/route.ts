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
    const processUptime = Math.floor(process.uptime())
    const likelyRunning = serviceStatus.isRunning || processUptime > 30

    // 返回状态信息
    return NextResponse.json({
      success: true,
      status: {
        isRunning: likelyRunning,
        currentProcessHasTimer: serviceStatus.isRunning,
        startTime: serviceStatus.startTime,
        lastCheckTime: serviceStatus.lastCheckTime,
        message: likelyRunning
          ? '自动结算服务已启动' 
          : '自动结算服务可能未启动',
        processUptime: `${processUptime}秒`
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'CDN-Cache-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': 'no-store',
        'Surrogate-Control': 'no-store'
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '获取状态失败' },
      { status: 500 }
    )
  }
}


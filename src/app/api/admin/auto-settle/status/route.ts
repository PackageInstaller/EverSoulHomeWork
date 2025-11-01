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
          ? '自动结算服务已启动（通过 instrumentation.ts）' 
          : '自动结算服务可能未启动',
        note: '服务在应用启动时通过 instrumentation.ts 自动启动，每小时检查一次，在每月最后一天的指定时间执行结算',
        processUptime: `${processUptime}秒`,
        timestamp: new Date().toISOString(),
        debug: `当前进程: ${serviceStatus.isRunning ? '有定时器' : '无定时器'}, 运行时长: ${processUptime}秒`
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


import { NextRequest, NextResponse } from 'next/server'
import { settleMonthlyPrizePool } from '@/lib/pointsCalculator'

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

    const { yearMonth } = await request.json()

    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return NextResponse.json(
        { error: '年月格式不正确，应为 YYYY-MM' },
        { status: 400 }
      )
    }

    // 执行结算
    const result = await settleMonthlyPrizePool(yearMonth)

    return NextResponse.json({
      success: true,
      message: '结算完成',
      result
    })

  } catch (error: any) {
    console.error('月度结算失败:', error)
    return NextResponse.json(
      { error: error.message || '结算失败' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAdminSession } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

// 获取基础奖池配置
export async function GET(request: NextRequest) {
  try {
    // 从数据库获取配置
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'base_prize_pool' }
    })

    const basePool = config ? parseFloat(config.value) : 200

    return NextResponse.json({
      success: true,
      basePool
    })

  } catch (error) {
    console.error('获取基础奖池配置失败:', error)
    return NextResponse.json(
      { error: '获取配置失败' },
      { status: 500 }
    )
  }
}

// 更新基础奖池配置
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

    const { basePool } = await request.json()

    // 验证参数
    if (typeof basePool !== 'number' || basePool < 0 || basePool > 10000) {
      return NextResponse.json(
        { error: '基础奖池必须是0-10000之间的数字' },
        { status: 400 }
      )
    }

    // 更新或创建配置
    await prisma.systemConfig.upsert({
      where: { key: 'base_prize_pool' },
      update: {
        value: basePool.toString(),
        description: '每月基础奖池金额'
      },
      create: {
        key: 'base_prize_pool',
        value: basePool.toString(),
        description: '每月基础奖池金额'
      }
    })

    return NextResponse.json({
      success: true,
      message: '基础奖池配置已更新',
      basePool
    })

  } catch (error: any) {
    console.error('更新基础奖池配置失败:', error)
    return NextResponse.json(
      { error: error.message || '更新配置失败' },
      { status: 500 }
    )
  }
}

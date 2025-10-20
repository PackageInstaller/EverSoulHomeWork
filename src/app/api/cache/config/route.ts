import { NextRequest, NextResponse } from 'next/server';
import { configureCache, getSmartCacheStats } from '@/lib/smartCache';

export const dynamic = 'force-dynamic';

/**
 * 获取缓存配置
 */
export async function GET(request: NextRequest) {
  try {
    const stats = getSmartCacheStats();
    
    return NextResponse.json({
      success: true,
      config: stats.config,
    });
  } catch (error) {
    console.error('获取缓存配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取缓存配置失败' },
      { status: 500 }
    );
  }
}

/**
 * 更新缓存配置
 * 
 * Body参数:
 * - updateInterval: 检查更新间隔（分钟）
 * - cacheExpiry: 缓存过期时间（小时）
 * - autoUpdate: 是否自动更新（boolean）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    configureCache({
      updateInterval: body.updateInterval,
      cacheExpiry: body.cacheExpiry,
      autoUpdate: body.autoUpdate,
    });
    
    const stats = getSmartCacheStats();
    
    return NextResponse.json({
      success: true,
      message: '缓存配置已更新',
      config: stats.config,
    });
  } catch (error) {
    console.error('更新缓存配置失败:', error);
    return NextResponse.json(
      { success: false, error: '更新缓存配置失败' },
      { status: 500 }
    );
  }
}


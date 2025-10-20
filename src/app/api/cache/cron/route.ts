import { NextRequest, NextResponse } from 'next/server';
import { preloadGameData } from '@/utils/dataUtils';

export const dynamic = 'force-dynamic';

/**
 * 定时任务：检查并刷新游戏数据缓存
 * 仅供内部定时器调用
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🔄 [缓存定时任务] 开始检查数据更新...');
    
    // 预加载两个数据源的游戏数据（这会触发缓存刷新）
    await Promise.all([
      preloadGameData('live'),
      preloadGameData('review')
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`✅ [缓存定时任务] 完成 - 耗时: ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      message: '缓存检查完成',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [缓存定时任务] 失败:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '缓存检查失败',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}


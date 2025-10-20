import { NextRequest, NextResponse } from 'next/server';
import { getSmartCacheStats } from '@/lib/smartCache';

export const dynamic = 'force-dynamic';

/**
 * 获取缓存统计信息
 */
export async function GET(request: NextRequest) {
  try {
    const stats = getSmartCacheStats();
    
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('获取缓存统计失败:', error);
    return NextResponse.json(
      { success: false, error: '获取缓存统计失败' },
      { status: 500 }
    );
  }
}


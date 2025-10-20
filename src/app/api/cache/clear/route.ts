import { NextRequest, NextResponse } from 'next/server';
import { clearSmartCache } from '@/lib/smartCache';

export const dynamic = 'force-dynamic';

/**
 * 清除所有缓存
 */
export async function POST(request: NextRequest) {
  try {
    clearSmartCache();
    
    return NextResponse.json({
      success: true,
      message: '所有缓存已清除',
    });
  } catch (error) {
    console.error('清除缓存失败:', error);
    return NextResponse.json(
      { success: false, error: '清除缓存失败' },
      { status: 500 }
    );
  }
}


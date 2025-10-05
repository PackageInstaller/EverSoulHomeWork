import { NextRequest, NextResponse } from 'next/server';
import { clearAllCache, cleanExpiredCache } from '@/lib/fileCache';

export async function POST(request: NextRequest) {
  try {
    // 从请求体获取参数（可选）
    let onlyExpired = false;
    try {
      const body = await request.json();
      onlyExpired = body.onlyExpired || false;
    } catch {
      // 如果没有请求体，默认清除所有
    }

    let deletedCount = 0;
    let message = '';

    if (onlyExpired) {
      // 只清理过期缓存
      deletedCount = await cleanExpiredCache();
      message = `已清理 ${deletedCount} 个过期缓存文件`;
    } else {
      // 清除所有缓存
      deletedCount = await clearAllCache();
      message = `缓存已清除，删除了 ${deletedCount} 个文件`;
    }

    return NextResponse.json({
      success: true,
      message,
      deletedCount
    });

  } catch (error) {
    console.error('清除缓存失败:', error);
    return NextResponse.json(
      { success: false, message: '清除缓存失败' },
      { status: 500 }
    );
  }
}
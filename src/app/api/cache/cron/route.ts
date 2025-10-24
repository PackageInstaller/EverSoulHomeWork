import { NextRequest, NextResponse } from 'next/server';
import { preloadGameData, clearCache } from '@/utils/dataUtils';
import { validateAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// 用于防止并发刷新
let isRefreshing = false;
let refreshStartTime = 0;
const REFRESH_TIMEOUT = 5 * 60 * 1000; // 5分钟超时，超过这个时间认为上次刷新已失败

/**
 * 手动刷新游戏数据缓存
 * 需要管理员权限
 * 
 * ✨ 强制刷新：先清除旧缓存，再从远程重新加载所有数据
 */
export async function POST(request: NextRequest) {
  // 验证管理员权限
  const isAdmin = await validateAdminSession(request);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, error: '需要管理员权限' },
      { status: 403 }
    );
  }

  // 防止并发刷新（带超时保护）
  const now = Date.now();
  if (isRefreshing) {
    const elapsed = now - refreshStartTime;
    if (elapsed < REFRESH_TIMEOUT) {
      // 还在超时时间内，拒绝新请求
      const remainingTime = Math.ceil((REFRESH_TIMEOUT - elapsed) / 1000);
      console.log(`⚠️ [手动刷新缓存] 刷新正在进行中，已耗时 ${Math.ceil(elapsed / 1000)}秒，请等待 ${remainingTime}秒`);
      return NextResponse.json({
        success: false,
        error: `缓存刷新正在进行中，请等待约 ${remainingTime} 秒...`,
      }, { status: 409 });
    } else {
      // 超过超时时间，强制允许新的刷新
      console.log(`⚠️ [手动刷新缓存] 上次刷新超时（${Math.ceil(elapsed / 1000)}秒），强制允许新的刷新`);
      isRefreshing = false;
    }
  }

  isRefreshing = true;
  refreshStartTime = now;
  const startTime = now;
  
  try {
    console.log('🔄 [手动刷新缓存] 开始强制刷新（清除旧缓存）...');
    
    // ✨ 强制刷新：先清除所有旧缓存
    console.log('🗑️ [手动刷新缓存] 清除旧缓存...');
    clearCache();
    console.log('✅ [手动刷新缓存] 旧缓存已清除');
    
    const successes: string[] = [];
    const failures: string[] = [];
    const errors: string[] = [];
    
    // 1. 加载 live 数据源
    console.log('🔄 [手动刷新缓存] 正在加载 live 数据源...');
    
    try {
      await preloadGameData('live');
      successes.push('live');
      console.log('✅ [手动刷新缓存] live数据源加载成功');
    } catch (error: any) {
      failures.push('live');
      const errorMsg = error?.message || '未知错误';
      errors.push(`live: ${errorMsg}`);
      console.error('❌ [手动刷新缓存] live数据源加载失败:', errorMsg);
    }
    
    // 2. 加载 review 数据源
    console.log('🔄 [手动刷新缓存] 正在加载 review 数据源...');
    
    try {
      await preloadGameData('review');
      successes.push('review');
      console.log('✅ [手动刷新缓存] review数据源加载成功');
    } catch (error: any) {
      failures.push('review');
      const errorMsg = error?.message || '未知错误';
      errors.push(`review: ${errorMsg}`);
      console.error('❌ [手动刷新缓存] review数据源加载失败:', errorMsg);
    }
    
    const duration = Date.now() - startTime;
    
    // 只要有一个成功就算部分成功
    const allSuccess = failures.length === 0;
    const partialSuccess = successes.length > 0 && failures.length > 0;
    
    const statusEmoji = allSuccess ? '✅' : partialSuccess ? '⚠️' : '❌';
    const summaryMsg = `${statusEmoji} 完成 - 耗时: ${duration}ms, 成功: [${successes.join(', ') || '无'}], 失败: [${failures.join(', ') || '无'}]`;
    
    console.log(`${statusEmoji} [手动刷新缓存] ${summaryMsg}`);
    
    // 构建详细信息
    let detailInfo = `耗时: ${Math.round(duration / 1000)}秒\n`;
    if (successes.length > 0) {
      detailInfo += `\n✅ 成功: ${successes.join(', ')}`;
    }
    if (failures.length > 0) {
      detailInfo += `\n\n❌ 失败: ${failures.join(', ')}`;
      if (errors.length > 0) {
        detailInfo += `\n错误详情:\n${errors.join('\n')}`;
      }
    }
    
    return NextResponse.json({
      success: allSuccess,
      partialSuccess,
      message: allSuccess 
        ? `✅ 缓存刷新成功！\n\n${detailInfo}` 
        : partialSuccess 
          ? `⚠️ 部分成功\n\n${detailInfo}`
          : `❌ 刷新失败\n\n${detailInfo}`,
      successes,
      failures,
      errors,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    // 捕获所有未预期的错误，确保 isRefreshing 被重置
    console.error('❌ [手动刷新缓存] 发生未预期的错误:', error);
    return NextResponse.json({
      success: false,
      message: `❌ 刷新失败\n\n发生未预期的错误: ${error.message || '未知错误'}`,
      errors: [error.message || '未知错误'],
      duration: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  } finally {
    // 无论如何都要重置标志
    isRefreshing = false;
    refreshStartTime = 0;
    console.log('🔓 [手动刷新缓存] isRefreshing 标志已重置');
  }
}


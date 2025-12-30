import { NextRequest, NextResponse } from 'next/server';
import { preloadGameData, clearCache } from '@/utils/dataUtils';
import { validateAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// 用于防止并发刷新
let refreshPromise: Promise<any> | null = null;


export async function POST(request: NextRequest) {
  // 验证管理员权限
  const isAdmin = await validateAdminSession(request);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, error: '需要管理员权限' },
      { status: 403 }
    );
  }

  // 如果已有刷新正在进行，等待其完成并返回相同的结果
  if (refreshPromise) {
    console.log('⏳ [手动刷新缓存] 检测到并发请求，等待正在进行的刷新完成...');
    const result = await refreshPromise;
    console.log('✅ [手动刷新缓存] 并发请求获得结果:', result.success ? '成功' : '失败');
    return NextResponse.json(result);
  }

  const startTime = Date.now();
  
  // 创建刷新 Promise，供后续并发请求使用
  refreshPromise = (async () => {
    try {
      console.log('🔄 [手动刷新缓存] 开始强制刷新（清除旧缓存）...');
      
      // ✨ 强制刷新：先清除所有旧缓存
      console.log('🗑️ [手动刷新缓存] 清除旧缓存...');
      clearCache();
      console.log('✅ [手动刷新缓存] 旧缓存已清除');
      
      const successes: string[] = [];
      const failures: string[] = [];
      const errors: string[] = [];
      
      // 并行加载两个数据源（提高速度，减少总耗时）
      console.log('🔄 [手动刷新缓存] 开始并行加载 Live 和 Review 数据源...');
      
      const loadPromises = [
        preloadGameData('Live')
          .then(() => {
            successes.push('Live');
            console.log('✅ [手动刷新缓存] Live数据源加载成功');
          })
          .catch((error: any) => {
            failures.push('Live');
            const errorMsg = error?.message || '未知错误';
            errors.push(`Live: ${errorMsg}`);
            console.error('❌ [手动刷新缓存] Live数据源加载失败:', errorMsg);
          }),
        
        preloadGameData('Review')
          .then(() => {
            successes.push('Review');
            console.log('✅ [手动刷新缓存] Review数据源加载成功');
          })
          .catch((error: any) => {
            failures.push('Review');
            const errorMsg = error?.message || '未知错误';
            errors.push(`Review: ${errorMsg}`);
            console.error('❌ [手动刷新缓存] Review数据源加载失败:', errorMsg);
          })
      ];
      
      // 等待所有数据源加载完成（无论成功或失败）
      await Promise.all(loadPromises);
      
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
      
      return {
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
      };
    } catch (error: any) {
      // 捕获所有未预期的错误
      console.error('❌ [手动刷新缓存] 发生未预期的错误:', error);
      return {
        success: false,
        message: `❌ 刷新失败\n\n发生未预期的错误: ${error.message || '未知错误'}`,
        errors: [error.message || '未知错误'],
        duration: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
      };
    } finally {
      // 无论如何都要清除 Promise 引用
      refreshPromise = null;
      console.log('🔓 [手动刷新缓存] refreshPromise 已清除');
    }
  })();

  // 等待刷新完成并返回结果
  const result = await refreshPromise;
  return NextResponse.json(result, result.success ? {} : { status: 500 });
}


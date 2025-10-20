import { NextRequest, NextResponse } from 'next/server';
import { preloadGameData, clearCache } from '@/utils/dataUtils';
import { validateAdminSession } from '@/lib/migration';

export const dynamic = 'force-dynamic';

/**
 * 手动刷新游戏数据缓存
 * 需要管理员权限
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

  const startTime = Date.now();
  
  console.log('🔄 [手动刷新缓存] 开始清除并重新加载缓存...');
  
  // 先清除现有缓存
  clearCache();
  
  // 分别尝试加载两个数据源，互不影响
  const results = await Promise.allSettled([
    preloadGameData('live'),
    preloadGameData('review')
  ]);
  
  const duration = Date.now() - startTime;
  
  // 统计结果
  const liveResult = results[0];
  const reviewResult = results[1];
  
  const successes: string[] = [];
  const failures: string[] = [];
  
  if (liveResult.status === 'fulfilled') {
    successes.push('live');
    console.log('✅ [手动刷新缓存] live数据源加载成功');
  } else {
    failures.push('live');
    console.error('❌ [手动刷新缓存] live数据源加载失败:', liveResult.reason?.message);
  }
  
  if (reviewResult.status === 'fulfilled') {
    successes.push('review');
    console.log('✅ [手动刷新缓存] review数据源加载成功');
  } else {
    failures.push('review');
    console.error('❌ [手动刷新缓存] review数据源加载失败:', reviewResult.reason?.message);
  }
  
  // 只要有一个成功就算部分成功
  const allSuccess = failures.length === 0;
  const partialSuccess = successes.length > 0 && failures.length > 0;
  
  console.log(`${allSuccess ? '✅' : partialSuccess ? '⚠️' : '❌'} [手动刷新缓存] 完成 - 耗时: ${duration}ms, 成功: [${successes.join(', ')}], 失败: [${failures.join(', ')}]`);
  
  return NextResponse.json({
    success: allSuccess,
    partialSuccess,
    message: allSuccess 
      ? '缓存刷新成功！所有数据源已重新加载' 
      : partialSuccess 
        ? '缓存部分刷新成功'
        : '缓存刷新失败',
    successes,
    failures,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  }, {
    status: allSuccess ? 200 : partialSuccess ? 207 : 500
  });
}


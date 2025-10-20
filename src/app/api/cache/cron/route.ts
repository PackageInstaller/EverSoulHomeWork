import { NextRequest, NextResponse } from 'next/server';
import { preloadGameData } from '@/utils/dataUtils';

export const dynamic = 'force-dynamic';

/**
 * 定时任务：检查并刷新游戏数据缓存
 * 仅供内部定时器调用
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  console.log('🔄 [缓存定时任务] 开始检查数据更新...');
  
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
    console.log('✅ [缓存定时任务] live数据源刷新成功');
  } else {
    failures.push('live');
    console.error('❌ [缓存定时任务] live数据源刷新失败:', liveResult.reason?.message);
  }
  
  if (reviewResult.status === 'fulfilled') {
    successes.push('review');
    console.log('✅ [缓存定时任务] review数据源刷新成功');
  } else {
    failures.push('review');
    console.error('❌ [缓存定时任务] review数据源刷新失败:', reviewResult.reason?.message);
  }
  
  // 只要有一个成功就算部分成功
  const allSuccess = failures.length === 0;
  const partialSuccess = successes.length > 0 && failures.length > 0;
  
  console.log(`${allSuccess ? '✅' : partialSuccess ? '⚠️' : '❌'} [缓存定时任务] 完成 - 耗时: ${duration}ms, 成功: [${successes.join(', ')}], 失败: [${failures.join(', ')}]`);
  
  return NextResponse.json({
    success: allSuccess,
    partialSuccess,
    message: allSuccess 
      ? '所有数据源刷新成功' 
      : partialSuccess 
        ? '部分数据源刷新成功'
        : '所有数据源刷新失败',
    successes,
    failures,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  }, {
    status: allSuccess ? 200 : partialSuccess ? 207 : 500
  });
}


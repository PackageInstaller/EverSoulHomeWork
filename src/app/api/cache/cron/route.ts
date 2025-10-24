import { NextRequest, NextResponse } from 'next/server';
import { preloadGameData, clearCache } from '@/utils/dataUtils';
import { validateAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// 用于存储刷新进度
let refreshProgress = {
  isRefreshing: false,
  current: 0,
  total: 2,
  currentSource: '',
  logs: [] as string[],
};

/**
 * 获取刷新进度（GET请求）
 */
export async function GET(request: NextRequest) {
  const isAdmin = await validateAdminSession(request);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, error: '需要管理员权限' },
      { status: 403 }
    );
  }

  return NextResponse.json(refreshProgress);
}

/**
 * 手动刷新游戏数据缓存
 * 需要管理员权限
 * 
 * ✨ 新逻辑：先加载新数据，成功后再清除旧缓存
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

  // 防止重复刷新
  if (refreshProgress.isRefreshing) {
    return NextResponse.json({
      success: false,
      error: '缓存刷新正在进行中，请稍候...',
    }, { status: 409 });
  }

  const startTime = Date.now();
  refreshProgress = {
    isRefreshing: true,
    current: 0,
    total: 2,
    currentSource: '',
    logs: [],
  };
  
  refreshProgress.logs.push('🚀 开始刷新缓存...');
  console.log('🔄 [手动刷新缓存] 开始加载新数据（不清除旧缓存）...');
  
  // ✨ 核心改进：先尝试加载新数据，不清除旧缓存
  const successes: string[] = [];
  const failures: string[] = [];
  const errors: string[] = [];
  
  // 1. 加载 live 数据源
  refreshProgress.current = 1;
  refreshProgress.currentSource = 'live';
  refreshProgress.logs.push('📦 正在加载 live 数据源...');
  console.log('🔄 [手动刷新缓存] 正在加载 live 数据源...');
  
  try {
    await preloadGameData('live');
    successes.push('live');
    refreshProgress.logs.push('✅ live 数据源加载成功');
    console.log('✅ [手动刷新缓存] live数据源加载成功');
  } catch (error: any) {
    failures.push('live');
    const errorMsg = error?.message || '未知错误';
    errors.push(`live: ${errorMsg}`);
    refreshProgress.logs.push(`❌ live 数据源加载失败: ${errorMsg}`);
    console.error('❌ [手动刷新缓存] live数据源加载失败:', errorMsg);
  }
  
  // 2. 加载 review 数据源
  refreshProgress.current = 2;
  refreshProgress.currentSource = 'review';
  refreshProgress.logs.push('📦 正在加载 review 数据源...');
  console.log('🔄 [手动刷新缓存] 正在加载 review 数据源...');
  
  try {
    await preloadGameData('review');
    successes.push('review');
    refreshProgress.logs.push('✅ review 数据源加载成功');
    console.log('✅ [手动刷新缓存] review数据源加载成功');
  } catch (error: any) {
    failures.push('review');
    const errorMsg = error?.message || '未知错误';
    errors.push(`review: ${errorMsg}`);
    refreshProgress.logs.push(`❌ review 数据源加载失败: ${errorMsg}`);
    console.error('❌ [手动刷新缓存] review数据源加载失败:', errorMsg);
  }
  
  const duration = Date.now() - startTime;
  
  // 只要有一个成功就算部分成功
  const allSuccess = failures.length === 0;
  const partialSuccess = successes.length > 0 && failures.length > 0;
  const totalFailure = successes.length === 0;
  
  const statusEmoji = allSuccess ? '✅' : partialSuccess ? '⚠️' : '❌';
  const summaryMsg = `${statusEmoji} 完成 - 耗时: ${duration}ms, 成功: [${successes.join(', ') || '无'}], 失败: [${failures.join(', ') || '无'}]`;
  
  refreshProgress.logs.push(summaryMsg);
  console.log(`${statusEmoji} [手动刷新缓存] ${summaryMsg}`);
  
  refreshProgress.isRefreshing = false;
  refreshProgress.currentSource = '完成';
  
  return NextResponse.json({
    success: allSuccess,
    partialSuccess,
    totalFailure,
    message: allSuccess 
      ? '✅ 缓存刷新成功！所有数据源已更新' 
      : partialSuccess 
        ? '⚠️ 缓存部分刷新成功，部分数据源加载失败'
        : '❌ 缓存刷新失败，所有数据源加载失败',
    successes,
    failures,
    errors,
    duration: `${duration}ms`,
    durationSeconds: Math.round(duration / 1000),
    timestamp: new Date().toISOString(),
    logs: refreshProgress.logs,
  }, {
    // 所有情况都返回200，通过 success 字段判断
    status: 200
  });
}


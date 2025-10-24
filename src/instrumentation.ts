/**
 * Next.js Instrumentation Hook
 * 这个文件会在服务器启动时自动执行（仅一次）
 * 用于执行初始化任务，如数据库健康检查和游戏数据缓存预加载
 */

import { performDatabaseHealthCheck } from './lib/migration';
import { getCacheStats, preloadGameData } from './utils/dataUtils';

export async function register() {
  // 检测是否在构建阶段
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';
  
  if (isBuildTime) {
    console.log('⏭️  构建阶段，跳过启动初始化');
    return;
  }

  // 只在 Node.js 运行时执行（排除 Edge Runtime）
  if (process.env.NEXT_RUNTIME === 'nodejs' || !process.env.NEXT_RUNTIME) {
    // ========================================
    // 1. 数据库健康检查
    // ========================================
    try {
      console.log('\n🚀 [服务器启动] 执行数据库健康检查...');
      
      const result = await performDatabaseHealthCheck();
      
      if (result.success) {
        console.log('✅ [服务器启动] 数据库健康检查完成');
        console.log('📋 [服务器启动] 执行的操作:', result.actions.join(', '));
      } else {
        console.warn('⚠️  [服务器启动] 数据库健康检查发现问题:', result.message);
        console.warn('📋 [服务器启动] 已执行的操作:', result.actions.join(', '));
        console.warn('⚠️  应用将继续启动，建议检查数据库状态');
      }
      
    } catch (error) {
      console.error('❌ [服务器启动] 数据库健康检查失败:', error);
      console.warn('⚠️  应用将继续启动，建议手动检查数据库状态');
    }

    // ========================================
    // 2. 游戏数据缓存预加载
    // ========================================
    try {
      console.log('\n🎮 [服务器启动] 开始预加载游戏数据...');
      console.log('💡 [服务器启动] 缓存存储在内存中，每次重启都需要重新加载');
      
      const startTime = Date.now();
      let successCount = 0;
      let failureCount = 0;
      
      // 预加载 live 数据源
      try {
        console.log('🔄 [服务器启动] 正在加载 live 数据源...');
        await preloadGameData('live');
        successCount++;
        console.log('✅ [服务器启动] live 数据源加载成功');
      } catch (error: any) {
        failureCount++;
        console.error('❌ [服务器启动] live 数据源加载失败:', error.message);
      }
      
      // 预加载 review 数据源
      try {
        console.log('🔄 [服务器启动] 正在加载 review 数据源...');
        await preloadGameData('review');
        successCount++;
        console.log('✅ [服务器启动] review 数据源加载成功');
      } catch (error: any) {
        failureCount++;
        console.error('❌ [服务器启动] review 数据源加载失败:', error.message);
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ [服务器启动] 游戏数据缓存预加载完成 - 耗时: ${duration}ms, 成功: ${successCount}, 失败: ${failureCount}`);
      
      // 显示最终缓存统计
      const finalStats = getCacheStats();
      console.log(`📊 [服务器启动] 缓存统计: ${finalStats.totalEntries} 项数据已加载`);
      
    } catch (error) {
      console.error('❌ [服务器启动] 游戏数据缓存加载失败:', error);
      console.warn('⚠️  应用将继续启动，可在后台管理手动刷新缓存');
    }

    console.log('\n🎉 [服务器启动] 所有初始化任务完成\n');
  }
}


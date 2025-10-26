import { performDatabaseHealthCheck } from './lib/migration';
import { getCacheStats, preloadGameData } from './utils/dataUtils';

export async function register() {
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

  if (isBuildTime) {
    return;
  }
  if (process.env.NEXT_RUNTIME === 'nodejs' || !process.env.NEXT_RUNTIME) {
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
    try {
      console.log('🎮 [服务器启动] 开始并行预加载游戏数据...');
      const startTime = Date.now();
      let successCount = 0;
      let failureCount = 0;

      // 并行加载两个数据源
      const loadPromises = [
        preloadGameData('live')
          .then(() => {
            successCount++;
            console.log('✅ [服务器启动] live 数据源加载成功');
          })
          .catch((error: any) => {
            failureCount++;
            console.error('❌ [服务器启动] live 数据源加载失败:', error.message);
          }),

        preloadGameData('review')
          .then(() => {
            successCount++;
            console.log('✅ [服务器启动] review 数据源加载成功');
          })
          .catch((error: any) => {
            failureCount++;
            console.error('❌ [服务器启动] review 数据源加载失败:', error.message);
          })
      ];

      // 等待所有数据源加载完成
      await Promise.all(loadPromises);

      const duration = Date.now() - startTime;
      console.log(`✅ [服务器启动] 游戏数据缓存预加载完成 - 耗时: ${duration}ms, 成功: ${successCount}, 失败: ${failureCount}`);
      const finalStats = getCacheStats();
      console.log(`📊 [服务器启动] ${finalStats.totalEntries} 项数据已加载`);

    } catch (error) {
      console.error('❌ [服务器启动] 游戏数据缓存加载失败:', error);
    }
  }
}


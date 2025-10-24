/**
 * Next.js Instrumentation Hook
 * 这个文件会在服务器启动时自动执行（仅一次）
 * 用于执行初始化任务，如数据库健康检查
 */

import { performDatabaseHealthCheck } from './lib/migration';

export async function register() {
  // 检测是否在构建阶段
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';
  
  if (isBuildTime) {
    console.log('⏭️  构建阶段，跳过数据库健康检查');
    return;
  }

  // 只在 Node.js 运行时执行（排除 Edge Runtime）
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
  }
}


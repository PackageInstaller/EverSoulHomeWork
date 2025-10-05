import { performDatabaseHealthCheck } from './migration';
import { startAutoSettlementService } from './autoSettlementService';

let migrationChecked = false;
let autoSettlementStarted = false;

/**
 * 应用启动时的数据库健康检查
 * 只在第一次调用时执行，避免重复检查
 */
export async function performStartupMigrationCheck(): Promise<void> {
  // 检测是否在构建阶段（使用更可靠的检测方法）
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';
  
  if (isBuildTime) {
    console.log('⏭️  构建阶段，跳过数据库检查');
    return;
  }
  
  if (migrationChecked) {
    return;
  }

  migrationChecked = true;
  
  try {
    console.log('\n🚀 执行启动时数据库健康检查...');
    
    const result = await performDatabaseHealthCheck();
    
    if (result.success) {
      console.log('✅ 数据库启动检查完成');
      console.log('执行的操作:', result.actions.join(', '));
    } else {
      console.warn('⚠️ 数据库启动检查发现问题:', result.message);
      console.warn('已执行的操作:', result.actions.join(', '));
      
      // 不阻止应用启动，只是警告
      console.warn('⚠️ 应用将继续启动，建议检查数据库状态');
    }
    
  } catch (error) {
    console.error('❌ 启动时数据库检查失败:', error);
    console.warn('⚠️ 应用将继续启动，建议手动检查数据库状态');
  }
  
  // 启动自动结算服务
  if (!autoSettlementStarted) {
    try {
      startAutoSettlementService();
      autoSettlementStarted = true;
    } catch (error) {
      console.error('❌ 自动结算服务启动失败:', error);
    }
  }
}

/**
 * 重置迁移检查状态（用于测试）
 */
export function resetMigrationCheck(): void {
  migrationChecked = false;
} 
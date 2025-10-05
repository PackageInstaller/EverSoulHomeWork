import { performStartupMigrationCheck } from '@/lib/startup';

/**
 * 服务器端启动迁移检查组件
 * 在应用首次渲染时自动执行数据库健康检查
 */
export default async function StartupMigrationCheck() {
  // 只在服务器端执行
  if (typeof window === 'undefined') {
    try {
      await performStartupMigrationCheck();
    } catch (error) {
      // 静默处理错误，不影响页面渲染
      console.error('启动迁移检查组件错误:', error);
    }
  }

  // 该组件不渲染任何内容
  return null;
} 
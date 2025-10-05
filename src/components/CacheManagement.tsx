'use client';

import { useState, useEffect } from 'react';

interface CacheStats {
  memory: {
    totalEntries: number;
    cacheHits: number;
    cacheMisses: number;
  };
  database: {
    hits: number;
  };
  file: {
    total: number;
    totalSize: number;
    totalSizeMB: string;
    bySource: Array<{
      dataSource: string;
      count: number;
      lastUpdate: string | null;
      size: number;
      sizeMB: string;
    }>;
  } | null;
}

interface UpdateTask {
  id: string;
  taskType: string;
  dataSource: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  updatedFiles: number;
}

export default function CacheManagement() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<UpdateTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [migrationLoading, setMigrationLoading] = useState(false);

  // 加载缓存状态
  const loadCacheStats = async () => {
    try {
      // 获取更新任务
      const tasksResponse = await fetch('/api/cache/update');
      if (tasksResponse.ok) {
        const data = await tasksResponse.json();
        setRecentTasks(data.recentTasks || []);
      }
      
      // 获取文件缓存统计
      const fileStatsResponse = await fetch('/api/cache/stats');
      let fileStats = null;
      if (fileStatsResponse.ok) {
        const data = await fileStatsResponse.json();
        fileStats = data.stats;
      }
      
      // 从前端获取内存缓存统计
      const { getCacheStats } = await import('@/utils/dataUtils');
      const memoryStats = await getCacheStats();
      
      // 合并统计信息
      setCacheStats({
        memory: memoryStats.memory,
        database: memoryStats.database,
        file: fileStats
      });
    } catch (error) {
      console.error('加载缓存状态失败:', error);
    }
  };

  // 检查数据库迁移状态
  const checkMigrationStatus = async () => {
    try {
      setMigrationLoading(true);
      const response = await fetch('/api/admin/migrate');
      if (response.ok) {
        const status = await response.json();
        setMigrationStatus(status);
      }
    } catch (error) {
      console.error('检查迁移状态失败:', error);
    } finally {
      setMigrationLoading(false);
    }
  };

  // 执行数据库健康检查和自动迁移
  const performHealthCheck = async () => {
    try {
      setMigrationLoading(true);
      const response = await fetch('/api/admin/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'health-check' })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}\n\n执行的操作:\n${result.actions.join('\n')}`);
      } else {
        alert(`❌ ${result.message}\n\n已执行的操作:\n${result.actions?.join('\n') || '无'}`);
      }
      
      // 重新检查状态
      await checkMigrationStatus();
      
    } catch (error) {
      console.error('健康检查失败:', error);
      alert('健康检查失败，请检查控制台输出');
    } finally {
      setMigrationLoading(false);
    }
  };

  // 触发缓存更新
  const triggerCacheUpdate = async (dataSource: string) => {
    setUpdating(dataSource);
    try {
      const response = await fetch('/api/cache/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataSource,
          isManual: true
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`缓存更新成功！更新了 ${result.updatedFiles} 个文件`);
        loadCacheStats();
      } else {
        alert(`缓存更新失败: ${result.message}`);
      }
    } catch (error) {
      console.error('缓存更新失败:', error);
      alert('缓存更新失败，请检查网络连接');
    } finally {
      setUpdating(null);
    }
  };

  // 清除缓存
  const clearCache = async () => {
    if (!confirm('确定要清除所有缓存吗？这将导致下次访问时重新下载数据。')) {
      return;
    }

    setLoading(true);
    try {
      const { clearCache } = await import('@/utils/dataUtils');
      await clearCache();
      alert('缓存已清除');
      loadCacheStats();
    } catch (error) {
      console.error('清除缓存失败:', error);
      alert('清除缓存失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCacheStats();
    checkMigrationStatus();
    
    // 每30秒刷新一次状态
    const interval = setInterval(() => {
      loadCacheStats();
      checkMigrationStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-300 bg-green-900/20 border-green-500/20';
      case 'running': return 'text-blue-300 bg-blue-900/20 border-blue-500/20';
      case 'failed': return 'text-red-300 bg-red-900/20 border-red-500/20';
      default: return 'text-gray-300 bg-gray-900/20 border-gray-500/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'running': return '运行中';
      case 'failed': return '失败';
      case 'pending': return '等待中';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">缓存管理</h2>
        <div className="flex space-x-3">
          <button
            onClick={loadCacheStats}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            刷新状态
          </button>
          <button
            onClick={clearCache}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 disabled:bg-red-800 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            {loading ? '清除中...' : '清除缓存'}
          </button>
        </div>
      </div>

      {/* 数据库迁移状态 */}
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">数据库迁移状态</h3>
          <div className="flex space-x-3">
            <button
              onClick={checkMigrationStatus}
              disabled={migrationLoading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              {migrationLoading ? '检查中...' : '检查状态'}
            </button>
            <button
              onClick={performHealthCheck}
              disabled={migrationLoading}
              className="bg-green-500 hover:bg-green-600 disabled:bg-green-800 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              {migrationLoading ? '执行中...' : '自动修复'}
            </button>
          </div>
        </div>
        
        {migrationStatus ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className={`w-3 h-3 rounded-full ${migrationStatus.needsMigration ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
              <span className="text-white">
                {migrationStatus.needsMigration ? '需要迁移' : '数据库最新'}
              </span>
            </div>
            
            {migrationStatus.needsMigration && migrationStatus.pendingMigrations.length > 0 && (
              <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-500/20 rounded">
                <div className="text-yellow-300 text-sm font-medium mb-2">待应用的迁移：</div>
                <div className="text-yellow-200 text-sm space-y-1">
                  {migrationStatus.pendingMigrations.map((migration: string, index: number) => (
                    <div key={index} className="font-mono">• {migration}</div>
                  ))}
                </div>
              </div>
            )}
            
            {migrationStatus.error && (
              <div className="mt-3 p-3 bg-red-900/20 border border-red-500/20 rounded">
                <div className="text-red-300 text-sm">
                  错误: {migrationStatus.error}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-white/50">正在检查迁移状态...</div>
        )}
      </div>

      {/* 缓存统计 */}
      {cacheStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 内存缓存统计 */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">内存缓存</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/70">缓存条目:</span>
                <span className="font-semibold text-white">{cacheStats.memory.totalEntries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">命中次数:</span>
                <span className="font-semibold text-green-400">{cacheStats.memory.cacheHits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">未命中次数:</span>
                <span className="font-semibold text-red-400">{cacheStats.memory.cacheMisses}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">数据库命中:</span>
                <span className="font-semibold text-blue-400">{cacheStats.database.hits}</span>
              </div>
            </div>
          </div>

          {/* 文件缓存统计 */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">文件缓存</h3>
            {cacheStats.file && cacheStats.file.total > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between pb-3 border-b border-white/10">
                  <span className="text-white/70">总文件数:</span>
                  <span className="font-semibold text-white">{cacheStats.file.total}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-white/10">
                  <span className="text-white/70">总大小:</span>
                  <span className="font-semibold text-blue-400">{cacheStats.file.totalSizeMB} MB</span>
                </div>
                
                {cacheStats.file.bySource.map((source) => (
                  <div key={source.dataSource} className="pt-2">
                    <div className="flex justify-between">
                      <span className="capitalize text-white font-medium">{source.dataSource}:</span>
                      <div className="text-right">
                        <div className="font-semibold text-green-400">{source.count} 个文件</div>
                        <div className="text-sm text-blue-300">{source.sizeMB} MB</div>
                        {source.lastUpdate && (
                          <div className="text-xs text-white/50">
                            {new Date(source.lastUpdate).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="mt-4 p-3 bg-green-900/20 border border-green-500/20 rounded">
                  <div className="flex items-center">
                    <span className="text-green-400 mr-2">✅</span>
                    <span className="text-green-300 text-sm font-medium">文件缓存已激活</span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-white/50 mb-3">暂无文件缓存</p>
                <div className="p-3 bg-yellow-900/20 border border-yellow-500/20 rounded">
                  <div className="flex items-center">
                    <span className="text-yellow-400 mr-2">⚠️</span>
                    <span className="text-yellow-300 text-sm">
                      建议点击"更新所有数据"来初始化缓存
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 缓存更新控制 */}
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">缓存管理操作</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => triggerCacheUpdate('live')}
            disabled={updating !== null}
            className="bg-green-500 hover:bg-green-600 disabled:bg-green-800 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            {updating === 'live' ? '更新中...' : '更新正式服数据'}
          </button>
          <button
            onClick={() => triggerCacheUpdate('review')}
            disabled={updating !== null}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            {updating === 'review' ? '更新中...' : '更新测试服数据'}
          </button>
          <button
            onClick={() => triggerCacheUpdate('all')}
            disabled={updating !== null}
            className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-800 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            {updating === 'all' ? '更新中...' : '更新所有数据'}
          </button>
        </div>
      </div>

      {/* 最近的更新任务 */}
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">最近的更新任务</h3>
        {recentTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-2 text-left text-white/70 text-sm">任务ID</th>
                  <th className="px-4 py-2 text-left text-white/70 text-sm">类型</th>
                  <th className="px-4 py-2 text-left text-white/70 text-sm">数据源</th>
                  <th className="px-4 py-2 text-left text-white/70 text-sm">状态</th>
                  <th className="px-4 py-2 text-left text-white/70 text-sm">更新文件数</th>
                  <th className="px-4 py-2 text-left text-white/70 text-sm">开始时间</th>
                  <th className="px-4 py-2 text-left text-white/70 text-sm">完成时间</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map((task) => (
                  <tr key={task.id} className="border-b border-white/5">
                    <td className="px-4 py-2 font-mono text-sm text-white/80">{task.id.slice(0, 8)}...</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs border ${
                        task.taskType === 'manual' ? 'bg-blue-900/20 text-blue-300 border-blue-500/20' : 'bg-green-900/20 text-green-300 border-green-500/20'
                      }`}>
                        {task.taskType === 'manual' ? '手动' : '自动'}
                      </span>
                    </td>
                    <td className="px-4 py-2 uppercase font-medium text-white">{task.dataSource}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(task.status)}`}>
                        {getStatusText(task.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center text-white">{task.updatedFiles}</td>
                    <td className="px-4 py-2 text-sm text-white/70">
                      {new Date(task.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-white/70">
                      {task.completedAt ? new Date(task.completedAt).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-white/50">暂无更新任务记录</p>
        )}
      </div>
    </div>
  );
} 
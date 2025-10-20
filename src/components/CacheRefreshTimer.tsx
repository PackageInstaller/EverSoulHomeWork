/**
 * 缓存自动刷新定时器组件
 * 在后台定期检查并刷新游戏数据缓存
 */

'use client';

import { useEffect, useRef } from 'react';

interface CacheRefreshTimerProps {
  intervalMinutes?: number; // 检查间隔（分钟），默认10分钟
  enabled?: boolean;        // 是否启用，默认true
}

export default function CacheRefreshTimer({
  intervalMinutes = 10,
  enabled = true,
}: CacheRefreshTimerProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      console.log('🔕 [缓存定时器] 已禁用');
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    console.log(`⏰ [缓存定时器] 已启动 - 每${intervalMinutes}分钟检查一次`);

    // 定时检查函数
    const checkCache = async () => {
      const now = Date.now();
      const timeSinceLastCheck = now - lastCheckRef.current;
      
      // 避免重复检查（如果距离上次检查不到设定间隔的90%）
      if (lastCheckRef.current && timeSinceLastCheck < intervalMs * 0.9) {
        console.log(`⏭️ [缓存定时器] 跳过检查 - 距离上次仅${Math.round(timeSinceLastCheck / 60000)}分钟`);
        return;
      }

      lastCheckRef.current = now;
      
      try {
        console.log('🔄 [缓存定时器] 开始检查数据更新...');
        
        const response = await fetch('/api/cache/cron', {
          method: 'GET',
          cache: 'no-store',
        });
        
        const data = await response.json();
        
        if (data.success) {
          console.log(`✅ [缓存定时器] 所有数据源刷新成功 - ${data.duration}`);
        } else if (data.partialSuccess) {
          console.warn(`⚠️ [缓存定时器] 部分成功 - ${data.duration}`, {
            成功: data.successes,
            失败: data.failures
          });
        } else {
          console.error(`❌ [缓存定时器] 所有数据源刷新失败 - ${data.duration}`, {
            失败: data.failures
          });
        }
      } catch (error) {
        console.error('❌ [缓存定时器] 请求失败:', error);
      }
    };

    // 首次延迟1分钟后检查（避免页面加载时立即触发）
    const initialDelay = setTimeout(() => {
      checkCache();
      
      // 然后开始定时检查
      timerRef.current = setInterval(checkCache, intervalMs);
    }, 60 * 1000); // 1分钟后首次检查

    // 清理函数
    return () => {
      console.log('🛑 [缓存定时器] 已停止');
      clearTimeout(initialDelay);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [intervalMinutes, enabled]);

  // 这个组件不渲染任何UI
  return null;
}


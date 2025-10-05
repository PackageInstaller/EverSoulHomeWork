'use client';

import { useEffect } from 'react';

/**
 * 客户端启动检查触发组件
 * 注意：实际的迁移检查已移到服务启动脚本中
 * 这个组件仅作为占位，不再执行任何操作
 */
export default function StartupMigrationCheck() {
  useEffect(() => {
    // 迁移检查已在服务器启动时由 src/lib/startup.ts 自动执行
    // 此处不需要额外操作
  }, []);

  // 该组件不渲染任何内容
  return null;
} 
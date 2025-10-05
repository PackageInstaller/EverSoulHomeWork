import { NextRequest, NextResponse } from 'next/server';
import { getCacheStats } from '@/lib/fileCache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 获取文件缓存统计信息
    const stats = await getCacheStats();

    // 按数据源分组统计
    const bySource: { [key: string]: { count: number; lastUpdate: Date | null; totalSize: number } } = {};

    stats.files.forEach(file => {
      if (!bySource[file.dataSource]) {
        bySource[file.dataSource] = {
          count: 0,
          lastUpdate: null,
          totalSize: 0
        };
      }

      bySource[file.dataSource].count++;
      bySource[file.dataSource].totalSize += file.size;

      if (!bySource[file.dataSource].lastUpdate || file.fetchedAt > bySource[file.dataSource].lastUpdate!) {
        bySource[file.dataSource].lastUpdate = file.fetchedAt;
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        total: stats.totalFiles,
        totalSize: stats.totalSize,
        totalSizeMB: (stats.totalSize / 1024 / 1024).toFixed(2),
        bySource: Object.entries(bySource).map(([dataSource, info]) => ({
          dataSource,
          count: info.count,
          lastUpdate: info.lastUpdate,
          size: info.totalSize,
          sizeMB: (info.totalSize / 1024 / 1024).toFixed(2)
        }))
      }
    });

  } catch (error) {
    console.error('获取缓存统计失败:', error);
    return NextResponse.json(
      { success: false, message: '获取缓存统计失败' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getCacheStats } from '@/lib/fileCache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 获取文件缓存统计信息
    const stats = await getCacheStats();

    // 按数据源分组统计
    const bySource: { [key: string]: { count: number; lastUpdate: Date | null; totalSize: number; totalCompressedSize: number } } = {};

    stats.files.forEach(file => {
      if (!bySource[file.dataSource]) {
        bySource[file.dataSource] = {
          count: 0,
          lastUpdate: null,
          totalSize: 0,
          totalCompressedSize: 0
        };
      }

      bySource[file.dataSource].count++;
      bySource[file.dataSource].totalSize += file.size;
      bySource[file.dataSource].totalCompressedSize += file.compressedSize;

      if (!bySource[file.dataSource].lastUpdate || file.fetchedAt > bySource[file.dataSource].lastUpdate!) {
        bySource[file.dataSource].lastUpdate = file.fetchedAt;
      }
    });

    const compressionRatio = stats.totalSize > 0 
      ? ((1 - stats.totalCompressedSize / stats.totalSize) * 100).toFixed(1)
      : '0';

    return NextResponse.json({
      success: true,
      stats: {
        total: stats.totalFiles,
        totalSize: stats.totalSize,
        totalSizeMB: (stats.totalSize / 1024 / 1024).toFixed(2),
        totalCompressedSize: stats.totalCompressedSize,
        totalCompressedSizeMB: (stats.totalCompressedSize / 1024 / 1024).toFixed(2),
        compressionRatio: compressionRatio + '%',
        bySource: Object.entries(bySource).map(([dataSource, info]) => ({
          dataSource,
          count: info.count,
          lastUpdate: info.lastUpdate,
          size: info.totalSize,
          sizeMB: (info.totalSize / 1024 / 1024).toFixed(2),
          compressedSize: info.totalCompressedSize,
          compressedSizeMB: (info.totalCompressedSize / 1024 / 1024).toFixed(2),
          compressionRatio: info.totalSize > 0 
            ? ((1 - info.totalCompressedSize / info.totalSize) * 100).toFixed(1) + '%'
            : '0%'
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
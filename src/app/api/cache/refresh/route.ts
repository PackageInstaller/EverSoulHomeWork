import { NextRequest, NextResponse } from 'next/server';
import { refreshCache, refreshAllCache } from '@/lib/smartCache';
import { DataSource } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 手动刷新缓存
 * 
 * 查询参数:
 * - dataSource: 数据源 (必填)
 * - fileName: 文件名 (可选，不填则刷新全部)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataSource = searchParams.get('dataSource') as DataSource;
    const fileName = searchParams.get('fileName');

    if (!dataSource) {
      return NextResponse.json(
        { success: false, error: '缺少dataSource参数' },
        { status: 400 }
      );
    }

    if (fileName) {
      // 刷新指定文件
      await refreshCache(dataSource, fileName);
      return NextResponse.json({
        success: true,
        message: `${fileName} 缓存已刷新`,
      });
    } else {
      // 刷新全部文件
      await refreshAllCache(dataSource);
      return NextResponse.json({
        success: true,
        message: '所有缓存已刷新',
      });
    }
  } catch (error) {
    console.error('刷新缓存失败:', error);
    return NextResponse.json(
      { success: false, error: '刷新缓存失败' },
      { status: 500 }
    );
  }
}


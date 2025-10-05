import { NextRequest, NextResponse } from 'next/server';
import { loadMultipleCacheFiles } from '@/lib/fileCache';

export const dynamic = 'force-dynamic';

/**
 * 批量获取多个缓存文件
 * POST /api/cache/batch
 * Body: { files: Array<{ dataSource: string, fileName: string }> }
 */
export async function POST(request: NextRequest) {
  try {
    const { files } = await request.json();

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { success: false, message: '请提供有效的文件列表' },
        { status: 400 }
      );
    }

    // 批量加载文件
    const results = await loadMultipleCacheFiles(files);

    // 转换为对象格式
    const data: { [key: string]: any } = {};
    results.forEach((value, key) => {
      data[key] = value;
    });

    return NextResponse.json({
      success: true,
      data,
      count: results.size,
      requested: files.length,
      cached: results.size,
      missing: files.length - results.size
    });

  } catch (error) {
    console.error('批量获取缓存失败:', error);
    return NextResponse.json(
      { success: false, message: '批量获取缓存失败' },
      { status: 500 }
    );
  }
}

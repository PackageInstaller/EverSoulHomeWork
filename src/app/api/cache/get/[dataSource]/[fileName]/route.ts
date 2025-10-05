import { NextRequest, NextResponse } from 'next/server';
import { loadCacheFromFile } from '@/lib/fileCache';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { dataSource: string; fileName: string } }
) {
  try {
    const { dataSource, fileName } = params;

    // 从文件系统加载缓存
    const data = await loadCacheFromFile(dataSource, fileName);

    if (!data) {
      return NextResponse.json(
        { success: false, message: '缓存不存在或已失效' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: JSON.stringify(data),
      fetchedAt: new Date(),
      isValid: true
    });

  } catch (error) {
    console.error('获取缓存数据失败:', error);
    return NextResponse.json(
      { success: false, message: '获取缓存数据失败' },
      { status: 500 }
    );
  }
} 
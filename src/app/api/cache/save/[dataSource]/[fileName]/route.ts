import { NextRequest, NextResponse } from 'next/server';
import { saveCacheToFile } from '@/lib/fileCache';

export async function POST(
  request: NextRequest,
  { params }: { params: { dataSource: string; fileName: string } }
) {
  try {
    const { dataSource, fileName } = params;
    const body = await request.json();
    const { data } = body;

    // 解析数据（如果是字符串）
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

    // 保存到文件系统
    await saveCacheToFile(dataSource, fileName, parsedData);

    return NextResponse.json({
      success: true,
      message: '缓存保存成功'
    });

  } catch (error) {
    console.error('保存缓存数据失败:', error);
    return NextResponse.json(
      { success: false, message: '保存缓存数据失败' },
      { status: 500 }
    );
  }
} 
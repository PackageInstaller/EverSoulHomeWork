import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * 动态serve上传的文件
 * 解决Next.js生产环境下public目录动态文件无法访问的问题
 * 
 * 访问路径：/api/uploads/homework/xxx.png
 * 映射到：public/uploads/homework/xxx.png
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = join(process.cwd(), 'public', 'uploads', ...params.path);
    const publicUploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!filePath.startsWith(publicUploadsDir)) {
      return NextResponse.json(
        { error: '非法路径' },
        { status: 403 }
      );
    }
    if (!existsSync(filePath)) {
      console.error(`文件不存在: ${filePath}`);
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(filePath);
    const ext = params.path[params.path.length - 1].split('.').pop()?.toLowerCase();
    const contentTypeMap: { [key: string]: string } = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
    };
    const contentType = contentTypeMap[ext || ''] || 'application/octet-stream';

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // 1年缓存
        'Access-Control-Allow-Origin': '*', // 允许跨域访问
      },
    });
  } catch (error) {
    console.error('读取文件失败:', error);
    return NextResponse.json(
      { error: '读取文件失败' },
      { status: 500 }
    );
  }
}

/**
 * 处理HEAD请求（用于CDN缓存检测）
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = join(process.cwd(), 'public', 'uploads', ...params.path);

    const publicUploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!filePath.startsWith(publicUploadsDir)) {
      return new NextResponse(null, { status: 403 });
    }

    if (!existsSync(filePath)) {
      return new NextResponse(null, { status: 404 });
    }

    const ext = params.path[params.path.length - 1].split('.').pop()?.toLowerCase();
    const contentTypeMap: { [key: string]: string } = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
    };
    const contentType = contentTypeMap[ext || ''] || 'application/octet-stream';

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('HEAD请求失败:', error);
    return new NextResponse(null, { status: 500 });
  }
}


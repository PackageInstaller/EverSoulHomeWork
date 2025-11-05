import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

/**
 * 删除消息图片
 */
export async function DELETE(request: NextRequest) {
  try {
    // 验证管理员权限
    if (!await validateAdminSession(request)) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, message: '缺少图片URL' },
        { status: 400 }
      );
    }

    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];

    if (!filename) {
      return NextResponse.json(
        { success: false, message: '无效的图片URL' },
        { status: 400 }
      );
    }

    // 构造文件路径
    const filePath = join(process.cwd(), 'public', 'uploads', 'messages', filename);
    
    // 安全检查：确保文件在正确的目录中
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'messages');
    if (!filePath.startsWith(uploadsDir)) {
      return NextResponse.json(
        { success: false, message: '非法路径' },
        { status: 403 }
      );
    }

    // 检查文件是否存在
    if (!existsSync(filePath)) {
      // 文件不存在也返回成功（幂等性）
      return NextResponse.json({
        success: true,
        message: '图片已删除或不存在'
      });
    }

    // 删除文件
    await unlink(filePath);

    return NextResponse.json({
      success: true,
      message: '图片删除成功'
    });

  } catch (error: any) {
    console.error('删除图片失败:', error);
    return NextResponse.json(
      { success: false, message: error.message || '删除失败' },
      { status: 500 }
    );
  }
}


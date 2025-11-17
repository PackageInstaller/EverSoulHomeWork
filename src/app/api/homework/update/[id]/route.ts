import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { 
  extractSignatureFromRequest, 
  verifySignature, 
  generateUploadSource 
} from '@/lib/signatureAuth';
import { headers } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// 验证并清理描述文本
function sanitizeDescription(text: string): string {
  if (!text) return '';
  // 移除HTML标签
  const withoutHtml = text.replace(/<[^>]*>/g, '');
  // 限制长度为1024字符
  return withoutHtml.slice(0, 1024).trim();
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const homeworkId = params.id;

    // 1. 提取签名信息
    const signatureData = extractSignatureFromRequest(request);
    if (!signatureData) {
      return NextResponse.json(
        { success: false, error: '缺少签名参数' },
        { status: 400 }
      );
    }

    // 2. 获取表单数据
    const formData = await request.formData();
    const stageId = formData.get('stageId') as string;
    const nickname = formData.get('nickname') as string;
    const description = formData.get('description') as string || '';
    const teamCount = parseInt(formData.get('teamCount') as string);
    const images = formData.getAll('images') as File[];

    if (!stageId || !nickname || !teamCount) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 3. 验证签名
    const headersList = headers();
    const userAgent = headersList.get('user-agent') || '';
    
    const imageNames = images.map(img => img.name);
    const source = generateUploadSource(stageId, nickname, imageNames);
    const signatureResult = verifySignature(
      signatureData.signature,
      source,
      signatureData.timestamp,
      signatureData.nonce,
      5 * 60 * 1000, // 5分钟时间窗口
      signatureData.sessionId,
      userAgent
    );

    if (!signatureResult.valid) {
      return NextResponse.json(
        { success: false, error: signatureResult.error || '签名验证失败' },
        { status: 403 }
      );
    }

    // 4. 验证用户身份
    // 从 sessionId 中提取 token（格式：userId_timestamp）
    const userId = signatureData.sessionId?.split('_')[0];
    
    // 查询用户
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.nickname !== nickname) {
      return NextResponse.json(
        { success: false, error: '用户验证失败' },
        { status: 403 }
      );
    }

    // 5. 查询原作业，确认是该用户的且状态为 rejected
    const existingHomework = await prisma.userHomework.findUnique({
      where: { id: homeworkId },
      include: {
        images: true
      }
    });

    if (!existingHomework) {
      return NextResponse.json(
        { success: false, error: '作业不存在' },
        { status: 404 }
      );
    }

    if (existingHomework.nickname !== nickname) {
      return NextResponse.json(
        { success: false, error: '无权修改他人作业' },
        { status: 403 }
      );
    }

    if (existingHomework.status !== 'rejected') {
      return NextResponse.json(
        { success: false, error: '只能编辑被拒绝的作业' },
        { status: 400 }
      );
    }

    // 6. 验证图片数量
    const minImages = teamCount;
    const maxImages = (teamCount * 2) + 10;

    if (images.length < minImages || images.length > maxImages) {
      return NextResponse.json(
        { success: false, error: `请上传 ${minImages} 到 ${maxImages} 张图片` },
        { status: 400 }
      );
    }

    // 7. 验证文件类型和大小
    for (const image of images) {
      if (!image.type.startsWith('image/')) {
        return NextResponse.json(
          { success: false, error: '只允许上传图片文件' },
          { status: 400 }
        );
      }
      if (image.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: `图片 ${image.name} 超过5MB限制` },
          { status: 400 }
        );
      }
    }

    // 8. 保存新图片
    const uploadDir = path.join(process.cwd(), 'public/uploads/homework');
    await fs.mkdir(uploadDir, { recursive: true });

    const savedImages: Array<{
      filename: string;
      originalName: string;
      mimeType: string;
      order: number;
      fileSize: number;
    }> = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const fileExtension = path.extname(image.name);
      const uniqueFilename = `${randomUUID()}${fileExtension}`;
      const filePath = path.join(uploadDir, uniqueFilename);

      const buffer = Buffer.from(await image.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      savedImages.push({
        filename: uniqueFilename,
        originalName: image.name,
        mimeType: image.type,
        order: i,
        fileSize: image.size,
      });
    }

    // 9. 删除旧图片文件
    for (const oldImage of existingHomework.images) {
      const oldFilePath = path.join(uploadDir, oldImage.filename);
      try {
        await fs.unlink(oldFilePath);
      } catch (error) {
        console.error(`删除旧图片失败: ${oldImage.filename}`, error);
        // 继续执行，不中断流程
      }
    }

    // 10. 更新数据库
    const updatedHomework = await prisma.$transaction(async (tx) => {
      // 删除旧图片记录
      await tx.homeworkImage.deleteMany({
        where: { homeworkId }
      });

      // 更新作业信息
      const homework = await tx.userHomework.update({
        where: { id: homeworkId },
        data: {
          description: sanitizeDescription(description),
          teamCount,
          status: 'pending', // 重新变为待审核
          updatedAt: new Date(),
          images: {
            create: savedImages
          }
        },
        include: {
          images: {
            orderBy: {
              order: 'asc'
            }
          }
        }
      });

      return homework;
    });

    return NextResponse.json({
      success: true,
      message: '作业更新成功，已重新提交审核',
      homework: updatedHomework
    });

  } catch (error) {
    console.error('更新作业失败:', error);
    return NextResponse.json(
      { success: false, error: '更新作业失败，请稍后重试' },
      { status: 500 }
    );
  }
}


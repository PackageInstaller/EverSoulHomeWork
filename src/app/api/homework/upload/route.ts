import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import {
  extractSignatureFromRequest,
  verifySignature,
  generateUploadSource
} from '@/lib/signatureAuth'
import { getClientIP, checkRateLimit, RateLimitPresets } from '@/lib/rateLimiter'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

// 配置文件大小限制 (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024
const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/homework')

// 验证和清理昵称
function sanitizeNickname(nickname: string): string {
  // 移除HTML标签和特殊字符，只保留中文、英文、数字、空格和常用标点
  return nickname
    .replace(/<[^>]*>/g, '') // 移除HTML标签
    .replace(/[<>"\\'&]/g, '') // 移除潜在危险字符
    .trim()
    .slice(0, 20) // 限制长度
}

// 验证和清理描述文本
function sanitizeDescription(description: string): string {
  return description
    .replace(/<[^>]*>/g, '') // 移除HTML标签
    .replace(/[<>"\\'&]/g, '') // 移除潜在危险字符
    .trim()
    .slice(0, 1024) // 限制长度
}

export async function POST(request: NextRequest) {
  try {
    // 1. 签名验证（先验证签名，拒绝无效请求）
    const signatureData = extractSignatureFromRequest(request);
    if (!signatureData) {
      return NextResponse.json(
        { error: '缺少签名参数' },
        { status: 400 }
      );
    }

    const formData = await request.formData()
    
    // 获取表单数据
    const stageId = formData.get('stageId') as string
    const nickname = formData.get('nickname') as string
    const description = formData.get('description') as string || ''
    const teamCount = parseInt(formData.get('teamCount') as string)
    const oldHomeworkId = formData.get('oldHomeworkId') as string | null // 旧作业ID（编辑模式）
    
    // 基本验证
    if (!stageId || !nickname || !teamCount) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 验证关卡ID格式
    if (!/^\d+-\d+$/.test(stageId)) {
      return NextResponse.json(
        { error: '关卡ID格式不正确' },
        { status: 400 }
      )
    }

    // 清理输入数据
    const cleanNickname = sanitizeNickname(nickname)
    const cleanDescription = sanitizeDescription(description)

    if (!cleanNickname) {
      return NextResponse.json(
        { error: '昵称不能为空或包含非法字符' },
        { status: 400 }
      )
    }

    // 获取图片文件
    const images = formData.getAll('images') as File[]
    
    // 验证签名（使用派生密钥）
    const headersList = headers();
    const userAgent = headersList.get('user-agent') || '';
    
    const imageNames = images.map(img => img.name);
    const source = generateUploadSource(stageId, cleanNickname, imageNames);
    const signatureResult = verifySignature(
      signatureData.signature,
      source,
      signatureData.timestamp,
      signatureData.nonce,
      5 * 60 * 1000, // windowMs
      signatureData.sessionId, // 会话ID用于重建派生密钥
      userAgent // User-Agent 用于重建派生密钥
    );

    if (!signatureResult.valid) {
      return NextResponse.json(
        { error: signatureResult.error || '签名验证失败' },
        { status: 403 }
      );
    }
    
    // 2. 速率限制检查（签名验证通过后）
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(clientIP, RateLimitPresets.UPLOAD_HOMEWORK);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: `请求过于频繁，请在 ${rateLimitResult.retryAfter} 秒后重试`,
          retryAfter: rateLimitResult.retryAfter
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': RateLimitPresets.UPLOAD_HOMEWORK.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      );
    }
    
    // 验证图片数量
    if (images.length < teamCount || images.length > (teamCount * 2) + 10) {
      return NextResponse.json(
        { error: `图片数量必须在 ${teamCount} 到 ${teamCount * 2 + 10} 张之间` },
        { status: 400 }
      )
    }

    // 验证每个图片文件
    for (const image of images) {
      if (!image.type.startsWith('image/')) {
        return NextResponse.json(
          { error: '只允许上传图片文件' },
          { status: 400 }
        )
      }

      if (image.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `图片 ${image.name} 超过5MB限制` },
          { status: 400 }
        )
      }
    }

    // 确保上传目录存在
    await mkdir(UPLOAD_DIR, { recursive: true })

    // 创建作业记录
    const homework = await prisma.userHomework.create({
      data: {
        stageId,
        nickname: cleanNickname,
        description: cleanDescription,
        teamCount,
        status: 'pending'
      }
    })

    // 处理和保存图片
    const savedImages = []
    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      const fileExtension = path.extname(image.name)
      const filename = `${homework.id}_${i}_${randomUUID()}${fileExtension}`
      const filepath = path.join(UPLOAD_DIR, filename)

      // 读取和优化图片
      const arrayBuffer = await image.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      let processedBuffer = buffer

      try {
        // 使用sharp优化图片（压缩、调整大小）
        const sharpBuffer = await sharp(buffer)
          .resize(1920, 1080, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ 
            quality: 85,
            progressive: true 
          })
          .toBuffer()
        processedBuffer = Buffer.from(sharpBuffer)
      } catch (error) {
        console.warn('图片优化失败，使用原图片:', error)
      }

      // 保存文件
      await writeFile(filepath, processedBuffer)

      // 保存图片记录
      const savedImage = await prisma.homeworkImage.create({
        data: {
          homeworkId: homework.id,
          filename,
          originalName: image.name,
          mimeType: image.type,
          fileSize: processedBuffer.length,
          order: i
        }
      })

      savedImages.push(savedImage)
    }

    // 如果是编辑模式（提供了 oldHomeworkId），删除旧作业
    if (oldHomeworkId) {
      try {
        // 验证旧作业属于当前用户且为被拒绝状态
        const oldHomework = await prisma.userHomework.findUnique({
          where: { id: oldHomeworkId },
          include: { images: true }
        });

        if (oldHomework && oldHomework.nickname === cleanNickname && oldHomework.status === 'rejected') {
          // 删除旧作业的图片文件
          for (const img of oldHomework.images) {
            const oldFilepath = path.join(UPLOAD_DIR, img.filename);
            try {
              await unlink(oldFilepath);
            } catch (error) {
              console.warn(`删除旧图片文件失败: ${img.filename}`, error);
            }
          }

          // 删除旧作业记录（级联删除图片记录）
          await prisma.userHomework.delete({
            where: { id: oldHomeworkId }
          });

          console.log(`已删除旧作业: ${oldHomeworkId}`);
        }
      } catch (error) {
        console.warn('删除旧作业失败（不影响新作业上传）:', error);
      }
    }

    return NextResponse.json({
      success: true,
      homework: {
        id: homework.id,
        stageId: homework.stageId,
        nickname: homework.nickname,
        description: homework.description,
        teamCount: homework.teamCount,
        status: homework.status,
        images: savedImages.map(img => ({
          id: img.id,
          filename: img.filename,
          originalName: img.originalName,
          order: img.order
        }))
      }
    })

  } catch (error) {
    console.error('作业上传失败:', error)
    return NextResponse.json(
      { error: '上传失败，请稍后重试' },
      { status: 500 }
    )
  }
} 
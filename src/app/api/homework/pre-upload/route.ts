import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import {
  extractSignatureFromRequest,
  verifySignature,
  generateUploadSource
} from '@/lib/signatureAuth'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

// 配置文件大小限制 (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024
const TEMP_UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/temp')

/**
 * 图片预上传API
 * 只上传图片到临时目录，不创建作业记录
 * 返回临时图片的URL列表，供后续批量提交使用
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 签名验证
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
    
    // 基本验证
    if (!stageId || !nickname) {
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

    // 获取图片文件
    const images = formData.getAll('images') as File[]
    
    if (images.length === 0) {
      return NextResponse.json(
        { error: '请至少上传一张图片' },
        { status: 400 }
      )
    }

    // 验证签名
    const headersList = headers();
    const userAgent = headersList.get('user-agent') || '';
    
    const imageNames = images.map(img => img.name);
    const source = generateUploadSource(stageId, nickname, imageNames);
    const signatureResult = verifySignature(
      signatureData.signature,
      source,
      signatureData.timestamp,
      signatureData.nonce,
      5 * 60 * 1000,
      signatureData.sessionId,
      userAgent
    );

    if (!signatureResult.valid) {
      return NextResponse.json(
        { error: signatureResult.error || '签名验证失败' },
        { status: 403 }
      );
    }

    // 验证图片数量和大小
    if (images.length > 10) {
      return NextResponse.json(
        { error: '最多只能上传10张图片' },
        { status: 400 }
      )
    }

    for (const image of images) {
      if (image.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `图片 ${image.name} 超过5MB限制` },
          { status: 400 }
        )
      }

      if (!image.type.startsWith('image/')) {
        return NextResponse.json(
          { error: `文件 ${image.name} 不是有效的图片` },
          { status: 400 }
        )
      }
    }

    // 确保临时上传目录存在
    await mkdir(TEMP_UPLOAD_DIR, { recursive: true })

    // 处理和保存图片到临时目录
    const savedImages: Array<{
      filename: string;
      originalName: string;
      url: string;
      fileSize: number;
    }> = []

    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      const fileExtension = path.extname(image.name)
      // 使用 temp_ 前缀标识临时文件
      const filename = `temp_${Date.now()}_${randomUUID()}${fileExtension}`
      const filepath = path.join(TEMP_UPLOAD_DIR, filename)

      // 读取和优化图片
      const arrayBuffer = await image.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      let processedBuffer = buffer

      try {
        // 使用sharp优化图片
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

      savedImages.push({
        filename,
        originalName: image.name,
        url: `/uploads/temp/${filename}`,
        fileSize: processedBuffer.length
      })
    }

    return NextResponse.json({
      success: true,
      message: '图片预上传成功',
      images: savedImages
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })

  } catch (error) {
    console.error('图片预上传失败:', error)
    return NextResponse.json(
      { error: '图片预上传失败，请稍后重试' },
      { status: 500 }
    )
  }
}


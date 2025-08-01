import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import sharp from 'sharp'

// 配置文件大小限制 (3MB)
const MAX_FILE_SIZE = 3 * 1024 * 1024
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
    .slice(0, 500) // 限制长度
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // 获取表单数据
    const stageId = formData.get('stageId') as string
    const nickname = formData.get('nickname') as string
    const description = formData.get('description') as string || ''
    const teamCount = parseInt(formData.get('teamCount') as string)
    
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
    
    // 验证图片数量
    if (images.length < teamCount || images.length > teamCount * 2) {
      return NextResponse.json(
        { error: `图片数量必须在 ${teamCount} 到 ${teamCount * 2} 张之间` },
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
          { error: `图片 ${image.name} 超过3MB限制` },
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
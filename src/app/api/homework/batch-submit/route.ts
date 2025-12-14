import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rename, unlink, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import {
  extractSignatureFromRequest,
  verifySignature,
  generateUploadSource
} from '@/lib/signatureAuth'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

const TEMP_UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/temp')
const HOMEWORK_UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/homework')

// 验证和清理昵称
function sanitizeNickname(nickname: string): string {
  return nickname
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"\\'&]/g, '')
    .trim()
    .slice(0, 20)
}

// 验证和清理描述文本
function sanitizeDescription(description: string): string {
  return description
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"\\'&]/g, '')
    .trim()
    .slice(0, 1024)
}

interface BatchSubmitItem {
  stageId: string;
  description: string;
  teamCount: number;
  tempImageFilenames: string[]; // 临时图片的文件名列表
}

/**
 * 批量提交作业API
 * 将预上传的临时图片移动到正式目录，并创建作业记录
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

    const body = await request.json()
    const { nickname, homeworks } = body as {
      nickname: string;
      homeworks: BatchSubmitItem[];
    }

    // 基本验证
    if (!nickname || !homeworks || !Array.isArray(homeworks) || homeworks.length === 0) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 清理输入数据
    const cleanNickname = sanitizeNickname(nickname)
    if (!cleanNickname) {
      return NextResponse.json(
        { error: '昵称不能为空或包含非法字符' },
        { status: 400 }
      )
    }

    // 验证签名
    const headersList = headers();
    const userAgent = headersList.get('user-agent') || '';
    
    // 使用所有关卡ID作为签名源
    const stageIds = homeworks.map(h => h.stageId).join(',');
    const source = generateUploadSource(stageIds, cleanNickname, []);
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

    // 确保目标目录存在
    await mkdir(HOMEWORK_UPLOAD_DIR, { recursive: true })

    const results: Array<{
      stageId: string;
      success: boolean;
      homeworkId?: string;
      error?: string;
    }> = []

    // 处理每个作业
    for (const homework of homeworks) {
      try {
        const { stageId, description, teamCount, tempImageFilenames } = homework

        // 验证关卡ID格式
        if (!/^\d+-\d+$/.test(stageId)) {
          results.push({
            stageId,
            success: false,
            error: '关卡ID格式不正确'
          })
          continue
        }

        // 验证是否有图片
        if (!tempImageFilenames || tempImageFilenames.length === 0) {
          results.push({
            stageId,
            success: false,
            error: '请至少上传一张图片'
          })
          continue
        }

        const cleanDescription = sanitizeDescription(description)

        // 创建作业记录
        const homeworkRecord = await prisma.userHomework.create({
          data: {
            stageId,
            nickname: cleanNickname,
            description: cleanDescription,
            teamCount,
            status: 'pending'
          }
        })

        // 移动临时图片到正式目录，并创建图片记录
        const savedImages = []
        for (let i = 0; i < tempImageFilenames.length; i++) {
          const tempFilename = tempImageFilenames[i]
          const tempFilepath = path.join(TEMP_UPLOAD_DIR, tempFilename)

          // 检查临时文件是否存在
          if (!existsSync(tempFilepath)) {
            console.warn(`临时文件不存在: ${tempFilename}`)
            continue
          }

          // 生成新的文件名
          const fileExtension = path.extname(tempFilename)
          const newFilename = `${homeworkRecord.id}_${i}_${Date.now()}${fileExtension}`
          const newFilepath = path.join(HOMEWORK_UPLOAD_DIR, newFilename)

          // 移动文件
          await rename(tempFilepath, newFilepath)

          // 创建图片记录
          const savedImage = await prisma.homeworkImage.create({
            data: {
              homeworkId: homeworkRecord.id,
              filename: newFilename,
              originalName: `image_${i}${fileExtension}`,
              mimeType: 'image/jpeg',
              fileSize: 0, // 可以后续优化获取实际大小
              order: i
            }
          })

          savedImages.push(savedImage)
        }

        results.push({
          stageId,
          success: true,
          homeworkId: homeworkRecord.id
        })

      } catch (error) {
        console.error(`处理关卡 ${homework.stageId} 失败:`, error)
        results.push({
          stageId: homework.stageId,
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        })
      }
    }

    // 统计结果
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `批量提交完成：成功 ${successCount} 个，失败 ${failCount} 个`,
      results
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })

  } catch (error) {
    console.error('批量提交作业失败:', error)
    return NextResponse.json(
      { error: '批量提交失败，请稍后重试' },
      { status: 500 }
    )
  }
}


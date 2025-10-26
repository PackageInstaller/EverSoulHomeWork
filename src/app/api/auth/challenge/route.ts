import { NextResponse } from 'next/server';
import { generateChallenge } from '@/lib/signatureAuth';
import { getAppKey } from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * 获取签名Challenge数据
 * 客户端使用这些数据来生成请求签名
 */
export async function GET() {
  try {
    const challenge = generateChallenge();
    const appKey = getAppKey();

    return NextResponse.json({
      success: true,
      data: {
        ...challenge,
        appKey // 提供AppKey给前端（类似游戏API的公开密钥）
      }
    });
  } catch (error) {
    console.error('生成Challenge失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}


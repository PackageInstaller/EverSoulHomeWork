import { NextResponse } from 'next/server';
import { generateChallenge } from '@/lib/signatureAuth';
import { getAppKey, deriveKey } from '@/lib/config';
import crypto from 'crypto';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * 获取签名Challenge数据
 * 客户端使用这些数据来生成请求签名
 * 
 * 安全改进：
 * - 不直接返回主 appKey
 * - 根据请求上下文生成派生密钥（Derived Key）
 * - 即使派生密钥泄露，也无法推导出主密钥或生成其他用户的签名
 */
export async function GET() {
  try {
    const challenge = generateChallenge();
    const masterKey = getAppKey();
    
    // 获取请求头信息用于生成唯一上下文
    const headersList = headers();
    const userAgent = headersList.get('user-agent') || '';
    const referer = headersList.get('referer') || '';
    
    // 生成会话ID（基于时间戳和随机数）
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    // 构建派生密钥的上下文
    // 包含: sessionId + nonce + timestamp + userAgent哈希
    const userAgentHash = crypto.createHash('sha256').update(userAgent).digest('hex').slice(0, 16);
    const context = `${sessionId}:${challenge.nonce}:${challenge.timestamp}:${userAgentHash}`;
    
    // 生成派生密钥（即使泄露也无法推导出主密钥）
    const derivedKey = deriveKey(masterKey, context);

    return NextResponse.json({
      success: true,
      data: {
        timestamp: challenge.timestamp,
        nonce: challenge.nonce,
        windowMs: challenge.windowMs,
        sessionId, // 返回 sessionId，用于服务器端重建派生密钥
        derivedKey // 派生密钥，可以安全地暴露给客户端
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


import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/jwt';
import { 
  extractSignatureFromRequest, 
  verifySignature, 
  generateRegisterSource 
} from '@/lib/signatureAuth';
import { getClientIP, checkRateLimit, RateLimitPresets } from '@/lib/rateLimiter';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. 签名验证（先验证签名，拒绝无效请求）
    const signatureData = extractSignatureFromRequest(request);
    if (!signatureData) {
      return NextResponse.json(
        { success: false, message: '缺少签名参数' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, password, nickname } = body;

    // 验证必填字段
    if (!email || !password || !nickname) {
      return NextResponse.json(
        { success: false, message: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 验证签名（使用派生密钥）
    const headersList = headers();
    const userAgent = headersList.get('user-agent') || '';
    
    const source = generateRegisterSource(email, nickname, password);
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
        { success: false, message: signatureResult.error || '签名验证失败' },
        { status: 403 }
      );
    }

    // 2. 速率限制检查（签名验证通过后）
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(clientIP, RateLimitPresets.REGISTER);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          message: `请求过于频繁，请在 ${rateLimitResult.retryAfter} 秒后重试`,
          retryAfter: rateLimitResult.retryAfter
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': RateLimitPresets.REGISTER.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: '密码长度至少6位' },
        { status: 400 }
      );
    }

    // 验证昵称格式：不允许空格、制表符、换行符等空白字符
    if (/\s/.test(nickname)) {
      return NextResponse.json(
        { success: false, message: '昵称不能包含空格或其他空白字符' },
        { status: 400 }
      );
    }

    // 验证昵称长度
    const getByteLength = (str: string) => {
      let byteLength = 0;
      for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i);
        if (charCode >= 0x4e00 && charCode <= 0x9fff) {
          byteLength += 2;
        } else {
          byteLength += 1;
        }
      }
      return byteLength;
    };

    if (getByteLength(nickname) > 16) {
      return NextResponse.json(
        { success: false, message: '昵称过长！最多16个字符' },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUserByEmail) {
      return NextResponse.json(
        { success: false, message: '该邮箱已被注册' },
        { status: 400 }
      );
    }

    // 检查昵称是否已被使用
    const existingUserByNickname = await prisma.user.findFirst({
      where: { nickname: nickname.trim() }
    });

    if (existingUserByNickname) {
      return NextResponse.json(
        { success: false, message: '该昵称已被使用，请选择其他昵称' },
        { status: 400 }
      );
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nickname: nickname.trim()
      }
    });

    // 生成JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      nickname: user.nickname
    });

    return NextResponse.json({
      success: true,
      message: '注册成功',
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname
      }
    });

  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}


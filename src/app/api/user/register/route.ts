import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, nickname } = body;

    // 验证必填字段
    if (!email || !password || !nickname) {
      return NextResponse.json(
        { success: false, message: '请填写所有必填字段' },
        { status: 400 }
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
        { success: false, message: '昵称过长！最多16个字符（中文为2个字符）' },
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


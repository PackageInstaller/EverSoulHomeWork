import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getUserFromToken, generateToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

// GET - 获取用户信息
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const userData = getUserFromToken(authHeader);

    if (!userData) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userData.id },
      select: {
        id: true,
        email: true,
        nickname: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// PATCH - 更新用户信息
export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const userData = getUserFromToken(authHeader);

    if (!userData) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nickname, oldPassword, newPassword } = body;

    // 验证昵称
    if (!nickname || !nickname.trim()) {
      return NextResponse.json(
        { success: false, message: '昵称不能为空' },
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
        { success: false, message: '昵称过长！最多16个字符（中文为2个字符）' },
        { status: 400 }
      );
    }

    // 获取当前用户
    const currentUser = await prisma.user.findUnique({
      where: { id: userData.id }
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    // 准备更新数据
    const updateData: any = {
      nickname: nickname.trim()
    };

    // 如果要修改密码
    if (oldPassword && newPassword) {
      // 验证旧密码
      const isOldPasswordValid = await bcrypt.compare(oldPassword, currentUser.password);
      
      if (!isOldPasswordValid) {
        return NextResponse.json(
          { success: false, message: '当前密码不正确' },
          { status: 400 }
        );
      }

      // 验证新密码长度
      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: '新密码长度至少6位' },
          { status: 400 }
        );
      }

      // 加密新密码
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // 检查昵称是否变更
    const nicknameChanged = nickname.trim() !== currentUser.nickname;
    
    // 如果昵称变更，检查是否会与现有数据冲突
    if (nicknameChanged) {
      // 1. 检查新昵称是否已被其他用户使用
      const existingUser = await prisma.user.findFirst({
        where: {
          nickname: nickname.trim(),
          NOT: {
            id: userData.id // 排除当前用户
          }
        }
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, message: '该昵称已被其他用户使用，请选择其他昵称' },
          { status: 400 }
        );
      }

      // 2. 检查新昵称是否已被其他用户在月度积分榜中使用
      const conflictingUserPoints = await prisma.userPoints.findFirst({
        where: {
          nickname: nickname.trim(),
          NOT: {
            nickname: currentUser.nickname
          }
        }
      });

      if (conflictingUserPoints) {
        return NextResponse.json(
          { success: false, message: '该昵称在月度积分榜中已被其他用户使用，无法修改' },
          { status: 400 }
        );
      }
    }

    // 使用事务更新用户和所有相关记录
    const result = await prisma.$transaction(async (tx) => {
      // 1. 更新用户
      const updatedUser = await tx.user.update({
        where: { id: userData.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          nickname: true,
          updatedAt: true
        }
      });

      // 2. 如果昵称变更了，同步更新所有相关记录
      if (nicknameChanged) {
        // 更新作业中的昵称
        await tx.userHomework.updateMany({
          where: { nickname: currentUser.nickname },
          data: { nickname: nickname.trim() }
        });

        // 更新积分历史中的昵称
        await tx.pointsHistory.updateMany({
          where: { nickname: currentUser.nickname },
          data: { nickname: nickname.trim() }
        });

        // 特殊处理 userPoints：由于有复合唯一索引 [nickname, yearMonth]
        // 我们需要先查出所有记录，删除后重新创建
        const oldUserPoints = await tx.userPoints.findMany({
          where: { nickname: currentUser.nickname }
        });

        if (oldUserPoints.length > 0) {
          // 删除旧记录
          await tx.userPoints.deleteMany({
            where: { nickname: currentUser.nickname }
          });

          // 创建新记录（使用新昵称）
          await tx.userPoints.createMany({
            data: oldUserPoints.map(point => ({
              nickname: nickname.trim(),
              yearMonth: point.yearMonth,
              points: point.points,
              homeworkCount: point.homeworkCount
            }))
          });
        }
      }

      return updatedUser;
    });

    const updatedUser = result;

    // 生成新JWT token
    const newToken = generateToken({
      id: updatedUser.id,
      email: updatedUser.email,
      nickname: updatedUser.nickname
    });

    return NextResponse.json({
      success: true,
      message: '资料更新成功',
      token: newToken,
      user: updatedUser
    });

  } catch (error) {
    console.error('更新用户信息失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}


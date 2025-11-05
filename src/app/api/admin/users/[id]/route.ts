import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAdminSession } from '@/lib/adminAuth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// PATCH - 管理员修改用户信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    if (!await validateAdminSession(request)) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const userId = params.id;
    const body = await request.json();
    const { nickname, email, password, newPassword } = body;
    const passwordToUpdate = password || newPassword; // 支持两种参数名

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    // 准备更新数据
    const updateData: any = {};

    // 如果修改昵称
    if (nickname !== undefined) {
      // 验证昵称
      if (!nickname || !nickname.trim()) {
        return NextResponse.json(
          { success: false, message: '昵称不能为空' },
          { status: 400 }
        );
      }

      // 验证昵称格式
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

      const nicknameChanged = nickname.trim() !== currentUser.nickname;

      // 如果昵称变更，检查是否会与现有数据冲突
      if (nicknameChanged) {
        // 检查新昵称是否已被其他用户使用
        const existingUser = await prisma.user.findFirst({
          where: {
            nickname: nickname.trim(),
            NOT: { id: userId }
          }
        });

        if (existingUser) {
          return NextResponse.json(
            { success: false, message: '该昵称已被其他用户使用' },
            { status: 400 }
          );
        }

        // 检查新昵称是否已被其他用户在月度积分榜中使用
        const conflictingUserPoints = await prisma.userPoints.findFirst({
          where: {
            nickname: nickname.trim(),
            NOT: { nickname: currentUser.nickname }
          }
        });

        if (conflictingUserPoints) {
          return NextResponse.json(
            { success: false, message: '该昵称在月度积分榜中已被其他用户使用' },
            { status: 400 }
          );
        }
      }

      updateData.nickname = nickname.trim();
    }

    // 如果修改邮箱
    if (email !== undefined) {
      // 验证邮箱
      if (!email || !email.trim()) {
        return NextResponse.json(
          { success: false, message: '邮箱不能为空' },
          { status: 400 }
        );
      }

      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json(
          { success: false, message: '邮箱格式不正确' },
          { status: 400 }
        );
      }

      const emailChanged = email.trim() !== currentUser.email;

      // 如果邮箱变更，检查是否已被其他用户使用
      if (emailChanged) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email: email.trim(),
            NOT: { id: userId }
          }
        });

        if (existingUser) {
          return NextResponse.json(
            { success: false, message: '该邮箱已被其他用户使用' },
            { status: 400 }
          );
        }
      }

      updateData.email = email.trim();
    }

    // 如果修改密码
    if (passwordToUpdate) {
      // 验证新密码长度
      if (passwordToUpdate.length < 6) {
        return NextResponse.json(
          { success: false, message: '新密码长度至少6位' },
          { status: 400 }
        );
      }

      // 加密新密码
      updateData.password = await bcrypt.hash(passwordToUpdate, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: '没有需要更新的内容' },
        { status: 400 }
      );
    }

    // 使用事务更新用户和相关记录
    const result = await prisma.$transaction(async (tx) => {
      // 更新用户
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          nickname: true,
          createdAt: true,
          updatedAt: true
        }
      });

      // 如果昵称变更了，同步更新所有相关记录
      if (updateData.nickname && updateData.nickname !== currentUser.nickname) {
        // 更新作业中的昵称
        await tx.userHomework.updateMany({
          where: { nickname: currentUser.nickname },
          data: { nickname: updateData.nickname }
        });

        // 更新积分历史中的昵称
        await tx.pointsHistory.updateMany({
          where: { nickname: currentUser.nickname },
          data: { nickname: updateData.nickname }
        });

        // 处理 userPoints
        const oldUserPoints = await tx.userPoints.findMany({
          where: { nickname: currentUser.nickname }
        });

        if (oldUserPoints.length > 0) {
          await tx.userPoints.deleteMany({
            where: { nickname: currentUser.nickname }
          });

          await tx.userPoints.createMany({
            data: oldUserPoints.map(point => ({
              nickname: updateData.nickname,
              yearMonth: point.yearMonth,
              points: point.points,
              homeworkCount: point.homeworkCount
            }))
          });
        }
      }

      return updatedUser;
    });

    // 构建更新成功消息
    let message = '用户信息更新成功';
    if (updateData.password) {
      message += '，密码已修改，该用户的所有登录会话已失效，需要使用新密码重新登录';
    }
    if (updateData.nickname && updateData.nickname !== currentUser.nickname) {
      message += '，昵称已全局同步更新';
    }

    return NextResponse.json({
      success: true,
      message,
      user: result,
      passwordChanged: !!updateData.password
    });

  } catch (error: any) {
    console.error('更新用户信息失败:', error);
    return NextResponse.json(
      { success: false, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}

// DELETE - 管理员删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    if (!await validateAdminSession(request)) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const userId = params.id;

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    // 使用事务删除用户及相关数据
    await prisma.$transaction(async (tx) => {
      // 删除用户的作业图片记录
      const homeworks = await tx.userHomework.findMany({
        where: { nickname: user.nickname },
        select: { id: true }
      });

      if (homeworks.length > 0) {
        await tx.homeworkImage.deleteMany({
          where: {
            homeworkId: {
              in: homeworks.map(h => h.id)
            }
          }
        });
      }

      // 删除用户的作业
      await tx.userHomework.deleteMany({
        where: { nickname: user.nickname }
      });

      // 删除用户的积分历史
      await tx.pointsHistory.deleteMany({
        where: { nickname: user.nickname }
      });

      // 删除用户的月度积分
      await tx.userPoints.deleteMany({
        where: { nickname: user.nickname }
      });

      // 删除用户的消息
      await tx.message.deleteMany({
        where: { userId: user.id }
      });

      // 删除用户
      await tx.user.delete({
        where: { id: userId }
      });
    });

    return NextResponse.json({
      success: true,
      message: '用户删除成功'
    });

  } catch (error: any) {
    console.error('删除用户失败:', error);
    return NextResponse.json(
      { success: false, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}


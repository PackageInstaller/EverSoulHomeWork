import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// 缓存：记录数据库是否使用 db push 模式
let isDbPushMode = false;
let lastCheckTime = 0;
const CHECK_CACHE_DURATION = 60000; // 缓存1分钟

interface MigrationStatus {
  needsMigration: boolean;
  pendingMigrations: string[];
  error?: string;
}

/**
 * 检查是否需要数据库迁移
 */
export async function checkMigrationStatus(silent = false): Promise<MigrationStatus> {
  try {
    if (!silent) {
      console.log('🔍 检查数据库迁移状态...');
    }

    // 如果已知是 db push 模式且缓存未过期，直接返回
    if (isDbPushMode && Date.now() - lastCheckTime < CHECK_CACHE_DURATION) {
      return {
        needsMigration: false,
        pendingMigrations: [],
        error: 'not_managed_cached'
      };
    }

    // 检查是否有待应用的迁移
    const { stdout, stderr } = await execAsync('npx prisma migrate status', {
      cwd: process.cwd()
    });

    // 检查是否数据库不受 Prisma Migrate 管理
    if (stderr && stderr.includes('not managed by Prisma Migrate')) {
      if (!silent && !isDbPushMode) {
        console.log('⚠️ 数据库未由 Prisma Migrate 管理（使用 db push 模式）');
      }
      isDbPushMode = true;
      lastCheckTime = Date.now();
      return {
        needsMigration: true,
        pendingMigrations: ['baseline-init'],
        error: 'not_managed'
      };
    }

    if (stderr && stderr.includes('drift detected')) {
      if (!silent) {
        console.log('⚠️ 检测到数据库结构偏移');
      }
      return {
        needsMigration: true,
        pendingMigrations: ['drift-fix'],
        error: '数据库结构与schema不一致'
      };
    }

    if (stdout.includes('Following migration have not yet been applied:') ||
      stdout.includes('Database schema is not up to date')) {
      if (!silent) {
        console.log('📋 发现待应用的迁移');
      }

      // 提取待应用的迁移名称
      const migrationLines = stdout.split('\n').filter(line =>
        line.trim().startsWith('• ')
      );

      const pendingMigrations = migrationLines.map(line =>
        line.trim().replace('• ', '')
      );

      return {
        needsMigration: true,
        pendingMigrations
      };
    }

    if (stdout.includes('Database is up to date') ||
      stdout.includes('No pending migrations found')) {
      if (!silent) {
        console.log('✅ 数据库已是最新版本');
      }
      isDbPushMode = false; // 正常的迁移模式
      return {
        needsMigration: false,
        pendingMigrations: []
      };
    }

    return {
      needsMigration: false,
      pendingMigrations: []
    };

  } catch (error: any) {
    // 特别处理 "not managed by Prisma Migrate" 错误
    if (error.stderr && error.stderr.includes('not managed by Prisma Migrate')) {
      if (!silent && !isDbPushMode) {
        console.log('⚠️ 数据库未由 Prisma Migrate 管理（使用 db push 模式）');
      }
      isDbPushMode = true;
      lastCheckTime = Date.now();
      return {
        needsMigration: true,
        pendingMigrations: ['baseline-init'],
        error: 'not_managed'
      };
    }

    if (!silent) {
      console.error('❌ 检查迁移状态失败:', error.message || error);
    }

    return {
      needsMigration: true,
      pendingMigrations: [],
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 检查数据库是否有表
 */
async function databaseHasTables(): Promise<boolean> {
  const prisma = new PrismaClient();
  try {
    // 尝试查询一个简单的表，如果失败说明数据库是空的
    await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' LIMIT 1`;
    const tables = await prisma.$queryRaw<Array<{ name: string }>>`SELECT name FROM sqlite_master WHERE type='table'`;
    await prisma.$disconnect();
    return tables.length > 1; // >1 因为SQLite总是有一个 sqlite_sequence 表
  } catch (error) {
    await prisma.$disconnect();
    return false;
  }
}

/**
 * 创建基线迁移（用于已存在的数据库）
 */
async function createBaselineMigration(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('📋 检测到数据库未由 Prisma Migrate 管理，尝试创建基线迁移...');

    const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
    const initMigrationDir = path.join(migrationsDir, '0_init');

    // 检查是否已经有迁移文件
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir);
      if (files.length > 0 && files.some(f => f !== '.gitkeep')) {
        console.log('⚠️ 迁移目录已存在但数据库未被管理，使用 db push 模式');
        return { success: false, message: 'migrations_exist_but_not_managed' };
      }
    }

    // 检查数据库是否有表
    const hasTables = await databaseHasTables();

    // 创建迁移目录
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    if (!fs.existsSync(initMigrationDir)) {
      fs.mkdirSync(initMigrationDir, { recursive: true });
    }

    console.log('📝 生成基线迁移 SQL...');

    // 生成迁移SQL
    const { stdout: migrationSql } = await execAsync(
      'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script',
      { cwd: process.cwd() }
    );

    // 写入迁移文件
    const migrationFile = path.join(initMigrationDir, 'migration.sql');
    fs.writeFileSync(migrationFile, migrationSql);

    console.log('✅ 基线迁移文件已创建');

    if (hasTables) {
      // 数据库已有表，只标记为已应用
      console.log('🏷️ 数据库已有表结构，标记基线迁移为已应用...');
      await execAsync('npx prisma migrate resolve --applied 0_init', {
        cwd: process.cwd()
      });
    } else {
      // 数据库是空的，实际应用迁移
      console.log('🚀 数据库为空，应用基线迁移...');
      await execAsync('npx prisma migrate deploy', {
        cwd: process.cwd()
      });
    }

    console.log('✅ 基线迁移创建完成');

    return {
      success: true,
      message: '基线迁移创建成功'
    };

  } catch (error: any) {
    console.error('❌ 创建基线迁移失败:', error.message || error);
    return {
      success: false,
      message: `基线迁移创建失败: ${error.message || error}`
    };
  }
}

/**
 * 自动应用数据库迁移
 */
export async function applyMigrations(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🚀 开始应用数据库迁移...');

    // 先检查当前状态
    const currentStatus = await checkMigrationStatus();

    // 如果数据库不受 Prisma Migrate 管理，尝试创建基线迁移
    if (currentStatus.error === 'not_managed') {
      console.log('🔧 数据库未由 Prisma Migrate 管理，尝试自动修复...');

      // 尝试创建基线迁移
      const baselineResult = await createBaselineMigration();

      if (baselineResult.success) {
        // 基线迁移创建成功，重新生成客户端
        console.log('🔄 重新生成Prisma客户端...');
        await execAsync('npx prisma generate', { cwd: process.cwd() });

        return {
          success: true,
          message: '数据库迁移完成（创建了基线迁移）'
        };
      }

      // 如果基线迁移创建失败，回退到 db push
      console.log('⚠️ 基线迁移创建失败，使用 db push 同步数据库结构...');

      try {
        const { stdout: pushOutput } = await execAsync(
          'npx prisma db push --skip-generate',
          { cwd: process.cwd() }
        );
        console.log('db push 输出:', pushOutput);

        // 重新生成Prisma客户端
        console.log('🔄 重新生成Prisma客户端...');
        await execAsync('npx prisma generate', { cwd: process.cwd() });

        // 标记为 db push 模式并更新缓存时间
        isDbPushMode = true;
        lastCheckTime = Date.now();

        return {
          success: true,
          message: '数据库同步完成（使用 db push）'
        };
      } catch (pushError: any) {
        console.error('db push失败:', pushError);
        return {
          success: false,
          message: `数据库同步失败: ${pushError.message || pushError}`
        };
      }
    }

    // 正常的迁移流程
    try {
      const { stdout: migrateOutput, stderr: migrateError } = await execAsync(
        'npx prisma migrate deploy',
        { cwd: process.cwd() }
      );

      if (migrateError && !migrateError.includes('All migrations have been successfully applied')) {
        console.error('迁移应用过程中的警告:', migrateError);
      }

      console.log('迁移输出:', migrateOutput);
    } catch (migrateError: any) {
      // 如果 migrate deploy 失败，尝试使用 db push
      console.log('⚠️ migrate deploy 失败，尝试使用 db push...');

      try {
        await execAsync('npx prisma db push --skip-generate', { cwd: process.cwd() });
      } catch (pushError) {
        console.error('db push 也失败了:', pushError);
        throw migrateError; // 抛出原始错误
      }
    }

    // 重新生成Prisma客户端
    console.log('🔄 重新生成Prisma客户端...');
    await execAsync('npx prisma generate', { cwd: process.cwd() });

    // 再次检查状态
    const finalStatus = await checkMigrationStatus();

    if (finalStatus.needsMigration && finalStatus.error !== 'not_managed') {
      // 如果仍然需要迁移，可能是drift问题，尝试修复
      console.log('🔧 尝试修复数据库结构偏移...');

      try {
        await execAsync('npx prisma db push --accept-data-loss=false', { cwd: process.cwd() });
        await execAsync('npx prisma generate', { cwd: process.cwd() });

        return {
          success: true,
          message: '数据库迁移完成（通过db push修复）'
        };
      } catch (pushError) {
        console.error('db push失败:', pushError);
        return {
          success: false,
          message: `自动迁移失败: ${pushError}`
        };
      }
    }

    return {
      success: true,
      message: '数据库迁移完成'
    };

  } catch (error) {
    console.error('❌ 应用迁移失败:', error);
    return {
      success: false,
      message: `迁移失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 测试数据库连接
 */
export async function testDatabaseConnection(): Promise<boolean> {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    await prisma.$disconnect();
    console.log('✅ 数据库连接正常');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    await prisma.$disconnect();
    return false;
  }
}

/**
 * 完整的数据库健康检查和自动修复
 */
export async function performDatabaseHealthCheck(): Promise<{
  success: boolean;
  message: string;
  actions: string[];
}> {
  const actions: string[] = [];

  try {
    // 1. 检查数据库连接
    const canConnect = await testDatabaseConnection();
    if (!canConnect) {
      return {
        success: false,
        message: '数据库连接失败',
        actions
      };
    }
    actions.push('数据库连接正常');

    // 2. 检查 migrations 目录是否存在
    const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
    let hasMigrations = false;

    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir);
      hasMigrations = files.length > 0 && files.some(f => f !== '.gitkeep');
    }

    // 如果没有migrations目录或目录为空，但数据库已存在表，创建基线迁移
    if (!hasMigrations) {
      console.log('📋 检测到 migrations 目录不存在或为空，尝试创建基线迁移...');
      const baselineResult = await createBaselineMigration();

      if (baselineResult.success) {
        actions.push('自动创建基线迁移');
        // 继续进行正常的迁移检查
      } else if (baselineResult.message === 'migrations_exist_but_not_managed') {
        // migrations存在但数据库未被管理，继续正常流程
      } else {
        console.log('⚠️ 基线迁移创建失败，继续使用现有逻辑');
      }
    }

    // 3. 检查迁移状态
    const migrationStatus = await checkMigrationStatus(true); // 使用静默模式

    // 如果是缓存的 db push 模式，直接返回成功
    if (migrationStatus.error === 'not_managed_cached') {
      return {
        success: true,
        message: '数据库状态正常（db push 模式）',
        actions: [...actions, '数据库使用 db push 模式（已缓存）']
      };
    }

    if (!migrationStatus.needsMigration) {
      return {
        success: true,
        message: '数据库状态正常，无需迁移',
        actions: [...actions, '数据库已是最新版本']
      };
    }

    // 3. 如果需要迁移，自动应用
    actions.push(`发现 ${migrationStatus.pendingMigrations.length} 个待应用迁移`);

    const migrationResult = await applyMigrations();
    actions.push(migrationResult.message);

    if (!migrationResult.success) {
      return {
        success: false,
        message: '自动迁移失败',
        actions
      };
    }

    // 4. 最终验证
    // 如果使用了 db push（数据库未被 Prisma Migrate 管理），则不需要再检查迁移状态
    if (migrationResult.message.includes('db push')) {
      actions.push('数据库同步完成（db push 模式）');
      return {
        success: true,
        message: '数据库健康检查和同步完成',
        actions
      };
    }

    const finalStatus = await checkMigrationStatus();
    if (finalStatus.needsMigration && finalStatus.error !== 'not_managed') {
      actions.push('警告: 迁移后仍有待处理项目');
      return {
        success: false,
        message: '迁移不完整',
        actions
      };
    }

    actions.push('数据库迁移完成，状态正常');
    return {
      success: true,
      message: '数据库健康检查和迁移完成',
      actions
    };

  } catch (error) {
    console.error('数据库健康检查失败:', error);
    return {
      success: false,
      message: `健康检查失败: ${error instanceof Error ? error.message : '未知错误'}`,
      actions
    };
  }
} 
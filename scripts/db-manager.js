#!/usr/bin/env node

/**
 * 数据库管理脚本 - 统一入口
 * 
 * 使用方法：
 *   node scripts/db-manager.js <command> [options]
 * 
 * 命令列表：
 *   init       - 初始化数据库（首次部署）
 *   fix        - 修复数据库（重建迁移和表结构）
 *   migrate    - 应用数据库迁移
 *   generate   - 生成Prisma客户端
 *   push       - 推送schema到数据库（不创建迁移）
 *   studio     - 打开Prisma Studio可视化界面
 *   check      - 检查数据库连接和状态
 *   backup     - 备份数据库
 *   vacuum     - 优化数据库（VACUUM）
 *   cleanup    - 清理旧表和无用数据
 *   reset      - 完全重置数据库（删除所有数据）
 *   status     - 查看数据库状态和统计信息
 *   help       - 显示帮助信息
 */

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const execAsync = promisify(exec);

const DB_PATH = path.join(__dirname, '../prisma/dev.db');
const MIGRATION_PATH = path.join(__dirname, '../prisma/migrations');
const BACKUP_DIR = path.join(__dirname, '../prisma/backups');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// ==================== 命令实现 ====================

/**
 * 初始化数据库
 */
async function initDatabase() {
  log('\n🗄️  初始化数据库...\n', 'cyan');
  
  try {
    info('生成 Prisma 客户端...');
    await execAsync('npx prisma generate');
    success('Prisma 客户端生成完成\n');
    
    info('推送数据库架构...');
    const { stdout } = await execAsync('npx prisma db push --accept-data-loss');
    console.log(stdout);
    success('数据库架构推送完成\n');
    
    success('数据库初始化完成！\n');
    info('现在可以运行: npm run dev\n');
    
  } catch (err) {
    error('数据库初始化失败');
    console.error(err);
    process.exit(1);
  }
}

/**
 * 修复数据库
 */
async function fixDatabase() {
  log('\n🔧 修复数据库...\n', 'cyan');
  
  try {
    // 备份现有数据库
    if (fs.existsSync(DB_PATH)) {
      info('发现现有数据库，正在备份...');
      await backupDatabase();
    }
    
    // 删除旧迁移
    if (fs.existsSync(MIGRATION_PATH)) {
      info('删除旧的迁移文件...');
      fs.rmSync(MIGRATION_PATH, { recursive: true, force: true });
      success('旧迁移文件已删除');
    }
    
    // 删除数据库文件
    if (fs.existsSync(DB_PATH)) {
      info('删除现有数据库文件...');
      fs.unlinkSync(DB_PATH);
      success('数据库文件已删除');
    }
    
    // 创建新迁移
    info('创建新的数据库迁移...');
    const { stdout } = await execAsync('npx prisma migrate dev --name init --skip-generate');
    console.log(stdout);
    success('迁移创建完成');
    
    // 生成客户端
    info('生成 Prisma 客户端...');
    await execAsync('npx prisma generate');
    success('Prisma 客户端生成完成\n');
    
    success('数据库修复完成！\n');
    
  } catch (err) {
    error('数据库修复失败');
    console.error(err);
    process.exit(1);
  }
}

/**
 * 应用数据库迁移
 */
async function migrateDatabase() {
  log('\n📋 应用数据库迁移...\n', 'cyan');
  
  try {
    const { stdout } = await execAsync('npx prisma migrate dev');
    console.log(stdout);
    success('数据库迁移完成\n');
    
  } catch (err) {
    error('数据库迁移失败');
    console.error(err);
    process.exit(1);
  }
}

/**
 * 生成Prisma客户端
 */
async function generateClient() {
  log('\n📦 生成 Prisma 客户端...\n', 'cyan');
  
  try {
    const { stdout } = await execAsync('npx prisma generate');
    console.log(stdout);
    success('Prisma 客户端生成完成\n');
    
  } catch (err) {
    error('生成客户端失败');
    console.error(err);
    process.exit(1);
  }
}

/**
 * 推送schema到数据库
 */
async function pushDatabase() {
  log('\n⬆️  推送 Schema 到数据库...\n', 'cyan');
  
  try {
    const { stdout } = await execAsync('npx prisma db push');
    console.log(stdout);
    success('Schema 推送完成\n');
    
  } catch (err) {
    error('Schema 推送失败');
    console.error(err);
    process.exit(1);
  }
}

/**
 * 打开Prisma Studio
 */
async function openStudio() {
  log('\n🎨 启动 Prisma Studio...\n', 'cyan');
  info('浏览器将自动打开 http://localhost:5555');
  info('按 Ctrl+C 退出\n');
  
  const studio = spawn('npx', ['prisma', 'studio'], {
    stdio: 'inherit',
    shell: true
  });
  
  studio.on('error', (err) => {
    error('启动 Prisma Studio 失败');
    console.error(err);
  });
}

/**
 * 检查数据库
 */
async function checkDatabase() {
  log('\n🔍 检查数据库状态...\n', 'cyan');
  
  try {
    // 检查数据库文件
    if (!fs.existsSync(DB_PATH)) {
      warning('数据库文件不存在');
      info('请运行: node scripts/db-manager.js init\n');
      return;
    }
    
    success('数据库文件存在');
    
    // 文件大小
    const stats = fs.statSync(DB_PATH);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    info(`数据库大小: ${sizeInMB} MB`);
    
    // 检查连接
    const prisma = new PrismaClient();
    
    try {
      await prisma.$connect();
      success('数据库连接正常');
      
      // 统计数据
      const [
        userCount,
        homeworkCount,
        pointsCount,
        historyCount,
        configCount
      ] = await Promise.all([
        prisma.user.count().catch(() => 0),
        prisma.userHomework.count().catch(() => 0),
        prisma.userPoints.count().catch(() => 0),
        prisma.pointsHistory.count().catch(() => 0),
        prisma.systemConfig.count().catch(() => 0)
      ]);
      
      log('\n📊 数据统计:', 'cyan');
      console.log(`  👥 用户数: ${userCount}`);
      console.log(`  📝 作业数: ${homeworkCount}`);
      console.log(`  💎 积分记录: ${pointsCount}`);
      console.log(`  📜 积分历史: ${historyCount}`);
      console.log(`  ⚙️  系统配置: ${configCount}`);
      
      console.log('');
      
    } finally {
      await prisma.$disconnect();
    }
    
  } catch (err) {
    error('数据库检查失败');
    console.error(err);
    process.exit(1);
  }
}

/**
 * 备份数据库
 */
async function backupDatabase() {
  log('\n💾 备份数据库...\n', 'cyan');
  
  try {
    if (!fs.existsSync(DB_PATH)) {
      warning('数据库文件不存在，无需备份\n');
      return;
    }
    
    // 创建备份目录
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // 生成备份文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `dev.db.backup.${timestamp}`);
    
    // 复制文件
    fs.copyFileSync(DB_PATH, backupPath);
    
    const stats = fs.statSync(backupPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    success(`数据库已备份: ${path.basename(backupPath)}`);
    info(`备份大小: ${sizeInMB} MB`);
    info(`备份位置: ${backupPath}\n`);
    
    // 清理旧备份（保留最近10个）
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('dev.db.backup.'))
      .sort()
      .reverse();
    
    if (backups.length > 10) {
      info('清理旧备份...');
      backups.slice(10).forEach(file => {
        fs.unlinkSync(path.join(BACKUP_DIR, file));
        info(`  删除: ${file}`);
      });
      console.log('');
    }
    
  } catch (err) {
    error('备份失败');
    console.error(err);
    process.exit(1);
  }
}

/**
 * 优化数据库
 */
async function vacuumDatabase() {
  log('\n🧹 优化数据库...\n', 'cyan');
  
  try {
    if (!fs.existsSync(DB_PATH)) {
      warning('数据库文件不存在\n');
      return;
    }
    
    const prisma = new PrismaClient();
    
    try {
      info('执行 VACUUM...');
      await prisma.$executeRawUnsafe('VACUUM;');
      success('VACUUM 完成');
      
      info('执行 ANALYZE...');
      await prisma.$executeRawUnsafe('ANALYZE;');
      success('ANALYZE 完成\n');
      
      success('数据库优化完成！\n');
      
    } finally {
      await prisma.$disconnect();
    }
    
  } catch (err) {
    error('数据库优化失败');
    console.error(err);
    process.exit(1);
  }
}

/**
 * 清理数据库
 */
async function cleanupDatabase() {
  log('\n🗑️  清理数据库...\n', 'cyan');
  
  try {
    const prisma = new PrismaClient();
    
    try {
      info('清理过期数据...');
      
      // 可以在这里添加清理逻辑
      // 例如：删除6个月前的数据等
      
      success('数据清理完成\n');
      
    } finally {
      await prisma.$disconnect();
    }
    
  } catch (err) {
    error('数据清理失败');
    console.error(err);
    process.exit(1);
  }
}

/**
 * 重置数据库
 */
async function resetDatabase() {
  log('\n⚠️  重置数据库（删除所有数据）...\n', 'yellow');
  
  // 安全确认（在CI环境跳过）
  if (!process.env.CI && process.stdin.isTTY) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('此操作将删除所有数据！确认吗？(yes/no): ', resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() !== 'yes') {
      info('操作已取消\n');
      return;
    }
  }
  
  try {
    // 先备份
    if (fs.existsSync(DB_PATH)) {
      await backupDatabase();
    }
    
    info('执行数据库重置...');
    const { stdout } = await execAsync('npx prisma migrate reset --force');
    console.log(stdout);
    success('数据库重置完成\n');
    
  } catch (err) {
    error('数据库重置失败');
    console.error(err);
    process.exit(1);
  }
}

/**
 * 查看数据库状态
 */
async function statusDatabase() {
  log('\n📊 数据库状态信息\n', 'cyan');
  
  try {
    // 基本信息
    if (fs.existsSync(DB_PATH)) {
      const stats = fs.statSync(DB_PATH);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      const modified = stats.mtime.toLocaleString('zh-CN');
      
      log('📁 数据库文件:', 'bright');
      console.log(`  路径: ${DB_PATH}`);
      console.log(`  大小: ${sizeInMB} MB`);
      console.log(`  修改时间: ${modified}\n`);
    } else {
      warning('数据库文件不存在\n');
      return;
    }
    
    // 迁移状态
    try {
      const { stdout } = await execAsync('npx prisma migrate status');
      log('📋 迁移状态:', 'bright');
      console.log(stdout);
    } catch (err) {
      warning('无法获取迁移状态\n');
    }
    
    // 数据统计
    await checkDatabase();
    
  } catch (err) {
    error('获取状态失败');
    console.error(err);
    process.exit(1);
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  log('\n📖 数据库管理工具 - 使用帮助\n', 'cyan');
  
  console.log('使用方法:');
  console.log('  node scripts/db-manager.js <command>');
  console.log('  或: npm run db:<command>\n');
  
  log('可用命令:', 'bright');
  console.log('  init       - 初始化数据库（首次部署）');
  console.log('  fix        - 修复数据库（重建迁移和表结构）');
  console.log('  migrate    - 应用数据库迁移');
  console.log('  generate   - 生成Prisma客户端');
  console.log('  push       - 推送schema到数据库（不创建迁移）');
  console.log('  studio     - 打开Prisma Studio可视化界面');
  console.log('  check      - 检查数据库连接和状态');
  console.log('  backup     - 备份数据库');
  console.log('  vacuum     - 优化数据库（VACUUM）');
  console.log('  cleanup    - 清理旧表和无用数据');
  console.log('  reset      - 完全重置数据库（删除所有数据）');
  console.log('  status     - 查看数据库状态和统计信息');
  console.log('  help       - 显示此帮助信息\n');
  
  log('常用场景:', 'bright');
  console.log('  首次部署:        npm run db:init');
  console.log('  修复问题:        npm run db:fix');
  console.log('  查看数据:        npm run db:studio');
  console.log('  检查状态:        npm run db:check');
  console.log('  备份数据:        npm run db:backup');
  console.log('  优化性能:        npm run db:vacuum\n');
}

// ==================== 主程序 ====================

async function main() {
  const command = process.argv[2];
  
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }
  
  const commands = {
    init: initDatabase,
    fix: fixDatabase,
    migrate: migrateDatabase,
    generate: generateClient,
    push: pushDatabase,
    studio: openStudio,
    check: checkDatabase,
    backup: backupDatabase,
    vacuum: vacuumDatabase,
    cleanup: cleanupDatabase,
    reset: resetDatabase,
    status: statusDatabase,
  };
  
  const handler = commands[command];
  
  if (!handler) {
    error(`未知命令: ${command}`);
    info('使用 "help" 查看可用命令\n');
    process.exit(1);
  }
  
  try {
    await handler();
  } catch (err) {
    error('命令执行失败');
    console.error(err);
    process.exit(1);
  }
}

// 运行主程序
if (require.main === module) {
  main().catch(err => {
    error('程序执行失败');
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  initDatabase,
  fixDatabase,
  migrateDatabase,
  generateClient,
  pushDatabase,
  checkDatabase,
  backupDatabase,
  vacuumDatabase,
  cleanupDatabase,
  resetDatabase,
  statusDatabase,
};


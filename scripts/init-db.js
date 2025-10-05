#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 在首次部署或数据库重置后运行
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function initDatabase() {
  console.log('\n🗄️  开始初始化数据库...\n');
  
  try {
    // 1. 生成 Prisma 客户端
    console.log('📦 生成 Prisma 客户端...');
    await execAsync('npx prisma generate');
    console.log('✅ Prisma 客户端生成完成\n');
    
    // 2. 推送数据库架构
    console.log('📋 推送数据库架构...');
    const { stdout } = await execAsync('npx prisma db push --accept-data-loss');
    console.log(stdout);
    console.log('✅ 数据库架构推送完成\n');
    
    console.log('✅ 数据库初始化完成！\n');
    console.log('现在可以运行以下命令启动服务：');
    console.log('  npm run build  # 构建生产版本');
    console.log('  npm start      # 启动生产服务');
    console.log('  或');
    console.log('  npm run dev    # 启动开发服务\n');
    
  } catch (error) {
    console.error('\n❌ 数据库初始化失败:', error);
    console.error('\n请尝试手动执行以下命令：');
    console.error('  npx prisma generate');
    console.error('  npx prisma db push\n');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { initDatabase };

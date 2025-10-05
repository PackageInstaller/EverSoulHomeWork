#!/usr/bin/env node

/**
 * 数据库压缩和优化脚本
 * 执行VACUUM操作以回收未使用的空间并优化数据库性能
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function vacuumDatabase() {
  console.log('\n🧹 开始数据库VACUUM操作...\n');
  
  const prisma = new PrismaClient();
  
  try {
    const dbPath = './prisma/dev.db';
    let beforeSize = 0;
    
    // 检查清理前的状态
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      beforeSize = stats.size / 1024 / 1024;
      console.log(`📊 数据库大小: ${beforeSize.toFixed(2)} MB`);
    }
    
    // 执行VACUUM操作
    console.log('\n🔧 执行 VACUUM 操作...');
    await prisma.$executeRaw`VACUUM`;
    console.log('✅ VACUUM 完成');
    
    // 检查清理后的状态
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      const afterSize = stats.size / 1024 / 1024;
      console.log(`📊 优化后大小: ${afterSize.toFixed(2)} MB`);
      
      const savedSize = beforeSize - afterSize;
      const savedPercent = beforeSize > 0 ? (savedSize / beforeSize * 100) : 0;
      
      if (savedSize > 0) {
        console.log(`\n💾 节省空间: ${savedSize.toFixed(2)} MB (${savedPercent.toFixed(1)}%)`);
      } else {
        console.log('\n💾 数据库大小无明显变化');
      }
    }
    
    console.log('\n✅ 数据库优化完成！');
    
  } catch (error) {
    console.error('\n❌ 数据库清理失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  vacuumDatabase().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { vacuumDatabase }; 
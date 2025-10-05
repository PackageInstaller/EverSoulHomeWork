#!/usr/bin/env node

/**
 * 清理旧的缓存表脚本
 * 删除不再使用的 GameDataCache、CacheUpdateTask 和 AdminUser 表
 */

const { PrismaClient } = require('@prisma/client');

async function cleanupOldTables() {
  console.log('\n🧹 开始清理旧的数据库表...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // 获取所有表名
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name IN ('game_data_cache', 'cache_update_tasks', 'admin_users')
    `;
    
    if (tables.length === 0) {
      console.log('✅ 没有找到需要清理的旧表');
      return;
    }
    
    console.log(`📊 找到 ${tables.length} 个旧表需要删除:`);
    tables.forEach(table => console.log(`  - ${table.name}`));
    
    // 删除旧表
    for (const table of tables) {
      const tableName = table.name;
      console.log(`\n🗑️  删除表: ${tableName}`);
      
      try {
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tableName}"`);
        console.log(`✅ ${tableName} 已删除`);
      } catch (error) {
        console.error(`❌ 删除 ${tableName} 失败:`, error.message);
      }
    }
    
    // 执行VACUUM以回收空间
    console.log('\n🔧 执行 VACUUM 以回收空间...');
    await prisma.$executeRaw`VACUUM`;
    console.log('✅ VACUUM 完成');
    
    console.log('\n✅ 旧表清理完成！');
    
  } catch (error) {
    console.error('\n❌ 清理失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  cleanupOldTables().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { cleanupOldTables };
